import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Canvas, Image as SkiaImage, Picture, createPicture, useImage } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { paintAnnotations } from '../../services/annotate/paint';
import { systemFont } from '../../services/annotate/font';
import type { Annotation, Pt, ShapeKind, StrokeTool, TextItem } from '../../services/annotate/types';

export type CanvasTool = 'view' | StrokeTool | 'erase' | ShapeKind | 'text';

type Props = {
  uri: string;
  annotations: Annotation[];
  tool: CanvasTool;
  color: string;
  width: number;
  opacity: number;
  onCommit: (a: Annotation) => void;
  onErase: (pt: Pt) => void;
  onTextPlace: (pt: Pt) => void;
  onTextSelect: (id: string) => void;
  onTextMove: (id: string, pt: Pt) => void;
};

let seq = 0;
const isShape = (t: CanvasTool): t is ShapeKind => t === 'rect' || t === 'oval' || t === 'line' || t === 'arrow';
const isStroke = (t: CanvasTool): t is StrokeTool => t === 'pen' || t === 'highlight';

export function AnnotationCanvas({ uri, annotations, tool, color, width, opacity, onCommit, onErase, onTextPlace, onTextSelect, onTextMove }: Props) {
  const image = useImage(uri);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [live, setLive] = useState<Annotation | null>(null);
  const start = useRef<Pt | null>(null);
  const moved = useRef(false);
  const dragText = useRef<{ id: string; orig: Pt; grab: Pt } | null>(null);

  // Zoom and Pan shared values
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const startScale = useSharedValue(1);
  const startTranslateX = useSharedValue(0);
  const startTranslateY = useSharedValue(0);

  // Reset zoom and translation on page/document URI changes
  useEffect(() => {
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
  }, [uri, scale, translateX, translateY]);

  const rect = useMemo(() => {
    if (!image || box.w === 0) return null;
    const iw = image.width();
    const ih = image.height();
    const scaleFactor = Math.min(box.w / iw, box.h / ih);
    const w = iw * scaleFactor;
    const h = ih * scaleFactor;
    return { x: (box.w - w) / 2, y: (box.h - h) / 2, w, h };
  }, [image, box]);

  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  const norm = (x: number, y: number): Pt | null => {
    if (!rect) return null;
    const nx = (x - rect.x) / rect.w;
    const ny = (y - rect.y) / rect.h;
    return { x: Math.max(0, Math.min(1, nx)), y: Math.max(0, Math.min(1, ny)) };
  };

  // Map absolute screen/container gesture coordinate to unscaled canvas coordinates
  const mapCoords = (x: number, y: number) => {
    'worklet';
    const cx = box.w / 2;
    const cy = box.h / 2;
    const origX = (x - cx) / scale.value + cx - translateX.value;
    const origY = (y - cy) / scale.value + cy - translateY.value;
    return { x: origX, y: origY };
  };

  // hit-test a text annotation at normalized point
  const textAt = (p: Pt): TextItem | null => {
    if (!rect) return null;
    const minSide = Math.min(rect.w, rect.h);
    for (let i = annotations.length - 1; i >= 0; i--) {
      const a = annotations[i];
      if (a.kind !== 'text') continue;
      const px = a.size * minSide;
      const wFrac = (a.text.length * px * 0.55) / rect.w;
      const hFrac = (px * 1.3) / rect.h;
      if (p.x >= a.x && p.x <= a.x + wFrac && p.y >= a.y && p.y <= a.y + hFrac) return a;
    }
    return null;
  };

  const begin = (x: number, y: number) => {
    const p = norm(x, y);
    if (!p) return;
    start.current = p;
    moved.current = false;
    if (tool === 'erase') return onErase(p);
    if (isStroke(tool)) return setLive({ id: `a${seq++}`, kind: 'stroke', tool, color, width, opacity, points: [p] });
    if (isShape(tool)) return setLive({ id: `a${seq++}`, kind: 'shape', shape: tool, a: p, b: p, color, width, opacity });
    if (tool === 'text') {
      const t = textAt(p);
      dragText.current = t ? { id: t.id, orig: { x: t.x, y: t.y }, grab: p } : null;
    }
  };

  const extend = (x: number, y: number) => {
    const p = norm(x, y);
    if (!p) return;
    if (start.current && Math.hypot(p.x - start.current.x, p.y - start.current.y) > 0.008) moved.current = true;
    if (tool === 'erase') return onErase(p);
    if (isStroke(tool)) return setLive(prev => (prev && prev.kind === 'stroke' ? { ...prev, points: [...prev.points, p] } : prev));
    if (isShape(tool)) return setLive(prev => (prev && prev.kind === 'shape' ? { ...prev, b: p } : prev));
    if (tool === 'text' && dragText.current) {
      const d = dragText.current;
      onTextMove(d.id, { x: d.orig.x + (p.x - d.grab.x), y: d.orig.y + (p.y - d.grab.y) });
    }
  };

  const end = () => {
    if (tool === 'text') {
      if (!moved.current && start.current) {
        const t = textAt(start.current);
        if (t) onTextSelect(t.id);
        else onTextPlace(start.current);
      }
      dragText.current = null;
      return;
    }
    setLive(prev => {
      if (prev) {
        if (prev.kind === 'stroke' && prev.points.length) onCommit(prev);
        else if (prev.kind === 'shape') onCommit(prev);
      }
      return null;
    });
  };

  // Zoom Gestures
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate(e => {
      scale.value = Math.max(1, Math.min(4, startScale.value * e.scale));
    });

  const navPanGesture = Gesture.Pan()
    .minPointers(tool === 'view' ? 1 : 2)
    .onStart(() => {
      startTranslateX.value = translateX.value;
      startTranslateY.value = translateY.value;
    })
    .onUpdate(e => {
      const maxTx = Math.max(0, (scale.value - 1) * box.w / 2);
      const maxTy = Math.max(0, (scale.value - 1) * box.h / 2);
      translateX.value = Math.max(-maxTx, Math.min(maxTx, startTranslateX.value + e.translationX));
      translateY.value = Math.max(-maxTy, Math.min(maxTy, startTranslateY.value + e.translationY));
    });

  // Drawing Gesture (exactly 1 finger, mapped via mapCoords)
  const drawGesture = Gesture.Pan()
    .enabled(tool !== 'view')
    .maxPointers(1)
    .minDistance(0)
    .onBegin(e => {
      const mapped = mapCoords(e.x, e.y);
      runOnJS(begin)(mapped.x, mapped.y);
    })
    .onUpdate(e => {
      const mapped = mapCoords(e.x, e.y);
      runOnJS(extend)(mapped.x, mapped.y);
    })
    .onEnd(() => {
      runOnJS(end)();
    })
    .onFinalize(() => {
      runOnJS(end)();
    });

  const zoomGesture = Gesture.Simultaneous(pinchGesture, navPanGesture);
  const gesture = tool === 'view' ? zoomGesture : Gesture.Simultaneous(zoomGesture, drawGesture);

  const picture = useMemo(() => {
    if (!rect) return null;
    const all = live ? [...annotations, live] : annotations;
    return createPicture(canvas => {
      canvas.translate(rect.x, rect.y);
      paintAnnotations(canvas, rect.w, rect.h, all, null, px => systemFont(px));
    });
  }, [rect, annotations, live]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      flex: 1,
      width: '100%',
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value }
      ]
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.fill} onLayout={onLayout}>
        <Animated.View style={animatedStyle}>
          <Canvas style={styles.fill}>
            {image && rect && <SkiaImage image={image} x={rect.x} y={rect.y} width={rect.w} height={rect.h} fit="fill" />}
            {picture && <Picture picture={picture} />}
          </Canvas>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1, width: '100%' } });
