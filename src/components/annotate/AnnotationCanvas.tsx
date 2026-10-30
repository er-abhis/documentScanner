import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Canvas, Image as SkiaImage, Picture, createPicture, useImage } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { paintAnnotations } from '../../services/annotate/paint';
import { systemFont } from '../../services/annotate/font';
import type { Annotation, Pt, RedactMode, ShapeKind, StrokeTool, TextItem } from '../../services/annotate/types';

export type CanvasTool = 'view' | StrokeTool | 'erase' | ShapeKind | 'text' | 'redact';

type Props = {
  uri: string;
  annotations: Annotation[];
  tool: CanvasTool;
  color: string;
  width: number;
  opacity: number;
  redactMode?: RedactMode;
  onCommit: (a: Annotation) => void;
  onErase: (pt: Pt) => void;
  onTextPlace: (pt: Pt) => void;
  onTextSelect: (id: string) => void;
  onTextMove: (id: string, pt: Pt) => void;
};

let seq = 0;
const isShape = (t: CanvasTool): t is ShapeKind => t === 'rect' || t === 'oval' || t === 'line' || t === 'arrow';
const isStroke = (t: CanvasTool): t is StrokeTool => t === 'pen' || t === 'highlight';

export function AnnotationCanvas({ uri, annotations, tool, color, width, opacity, redactMode = 'solid', onCommit, onErase, onTextPlace, onTextSelect, onTextMove }: Props) {
  const image = useImage(uri);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [live, setLive] = useState<Annotation | null>(null);
  const liveRef = useRef<Annotation | null>(null);
  const isDrawing = useRef(false);
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
    isDrawing.current = true;
    start.current = p;
    moved.current = false;
    if (tool === 'erase') return onErase(p);
    let item: Annotation | null = null;
    if (isStroke(tool)) item = { id: `a${seq++}`, kind: 'stroke', tool, color, width, opacity, points: [p] };
    else if (isShape(tool)) item = { id: `a${seq++}`, kind: 'shape', shape: tool, a: p, b: p, color, width, opacity };
    else if (tool === 'redact') item = { id: `a${seq++}`, kind: 'redact', mode: redactMode, a: p, b: p };
    else if (tool === 'text') {
      const t = textAt(p);
      dragText.current = t ? { id: t.id, orig: { x: t.x, y: t.y }, grab: p } : null;
    }
    if (item) {
      liveRef.current = item;
      setLive(item);
    }
  };

  const extend = (x: number, y: number) => {
    if (!isDrawing.current) return;
    const p = norm(x, y);
    if (!p) return;
    if (start.current && Math.hypot(p.x - start.current.x, p.y - start.current.y) > 0.008) moved.current = true;
    if (tool === 'erase') return onErase(p);
    const curr = liveRef.current;
    if (curr) {
      let updated: Annotation | null = null;
      if (curr.kind === 'stroke') updated = { ...curr, points: [...curr.points, p] };
      else if (curr.kind === 'shape') updated = { ...curr, b: p };
      else if (curr.kind === 'redact') updated = { ...curr, b: p };
      if (updated) {
        liveRef.current = updated;
        setLive(updated);
      }
    }
    if (tool === 'text' && dragText.current) {
      const d = dragText.current;
      onTextMove(d.id, { x: d.orig.x + (p.x - d.grab.x), y: d.orig.y + (p.y - d.grab.y) });
    }
  };

  const end = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (tool === 'text') {
      if (!moved.current && start.current) {
        const t = textAt(start.current);
        if (t) onTextSelect(t.id);
        else onTextPlace(start.current);
      }
      dragText.current = null;
      return;
    }
    const toCommit = liveRef.current;
    liveRef.current = null;
    setLive(null);
    if (toCommit) {
      if (toCommit.kind === 'stroke' && toCommit.points.length) onCommit(toCommit);
      else if (toCommit.kind === 'shape') onCommit(toCommit);
      else if (toCommit.kind === 'redact' && Math.abs(toCommit.b.x - toCommit.a.x) > 0.01 && Math.abs(toCommit.b.y - toCommit.a.y) > 0.01) onCommit(toCommit);
    }
  };

  const gesture = useMemo(() => {
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

    const zoomGesture = Gesture.Simultaneous(pinchGesture, navPanGesture);
    if (tool === 'view') return zoomGesture;

    const drawGesture = Gesture.Pan()
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
      .onFinalize(() => {
        runOnJS(end)();
      });

    return Gesture.Simultaneous(zoomGesture, drawGesture);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, box.w, box.h]);

  const committedPicture = useMemo(() => {
    if (!rect) return null;
    return createPicture(canvas => {
      canvas.translate(rect.x, rect.y);
      paintAnnotations(canvas, rect.w, rect.h, annotations, null, px => systemFont(px), image);
    });
  }, [rect, annotations, image]);

  const livePicture = useMemo(() => {
    if (!rect || !live) return null;
    return createPicture(canvas => {
      canvas.translate(rect.x, rect.y);
      paintAnnotations(canvas, rect.w, rect.h, [live], null, px => systemFont(px), image);
    });
  }, [rect, live, image]);

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
            {committedPicture && <Picture picture={committedPicture} />}
            {livePicture && <Picture picture={livePicture} />}
          </Canvas>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1, width: '100%' } });
