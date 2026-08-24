import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Canvas, Picture, Skia, createPicture, type SkImage, type SkFont } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { paintCollage } from '../../services/collage/paint';
import { RATIO_VALUE, type CollageProject, type FrameFill, type Template } from '../../services/collage/types';

type Props = {
  template: Template;
  project: CollageProject;
  images: Record<string, SkImage | undefined>;
  font?: SkFont | null;
  selectedId: string | null;
  onSelect: (frameId: string, isEmpty: boolean) => void;
  onAdjust: (frameId: string, fill: FrameFill) => void;
  brand: string;
};

/**
 * Live collage surface. Renders via a recorded Skia Picture (same paint code as
 * export), and captures gestures: tap selects a frame (empty -> add photo),
 * pan/pinch move & zoom the image *inside* the selected frame. The frame stays
 * fixed — only its image transforms.
 */
export function CollageCanvas({ template, project, images, font, selectedId, onSelect, onAdjust, brand }: Props) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const start = useRef<FrameFill | null>(null);

  const ratio = RATIO_VALUE[project.ratio] ?? 1;
  const disp = useMemo(() => {
    if (box.w === 0) return { W: 0, H: 0 };
    let W = box.w;
    let H = W / ratio;
    if (H > box.h) {
      H = box.h;
      W = H * ratio;
    }
    return { W, H };
  }, [box, ratio]);

  const picture = useMemo(() => {
    if (disp.W === 0) return null;
    return createPicture(canvas => {
      paintCollage(canvas, disp.W, disp.H, { template, project, images, font, selectedId, brand });
    }, Skia.XYWHRect(0, 0, disp.W, disp.H));
  }, [disp, template, project, images, font, selectedId, brand]);

  const gap = (project.style.spacing * Math.min(disp.W, disp.H)) / 2;

  const rectOf = (id: string) => {
    const f = template.frames.find(fr => fr.id === id);
    if (!f) return null;
    return {
      x: f.x * disp.W + gap,
      y: f.y * disp.H + gap,
      w: f.w * disp.W - gap * 2,
      h: f.h * disp.H - gap * 2,
    };
  };

  const hitTest = (x: number, y: number): string | null => {
    // topmost frame (highest z) containing the point
    const sorted = [...template.frames].sort((a, b) => (b.z ?? 0) - (a.z ?? 0));
    for (const f of sorted) {
      const r = rectOf(f.id);
      if (r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return f.id;
    }
    return null;
  };

  const handleTap = (x: number, y: number) => {
    const id = hitTest(x, y);
    if (!id) return;
    onSelect(id, !project.fills[id]?.uri);
  };

  const captureStart = () => {
    if (selectedId) start.current = { ...(project.fills[selectedId] ?? { scale: 1, tx: 0, ty: 0 }) };
  };
  const applyPan = (dx: number, dy: number) => {
    if (!selectedId || !start.current) return;
    const r = rectOf(selectedId);
    if (!r || !project.fills[selectedId]?.uri) return;
    onAdjust(selectedId, { ...start.current, tx: start.current.tx + dx / r.w, ty: start.current.ty + dy / r.h });
  };
  const applyPinch = (s: number) => {
    if (!selectedId || !start.current) return;
    if (!project.fills[selectedId]?.uri) return;
    onAdjust(selectedId, { ...start.current, scale: Math.max(1, Math.min(5, start.current.scale * s)) });
  };

  const tap = Gesture.Tap().maxDuration(250).onEnd(e => runOnJS(handleTap)(e.x, e.y));
  const pan = Gesture.Pan()
    .onStart(() => runOnJS(captureStart)())
    .onUpdate(e => runOnJS(applyPan)(e.translationX, e.translationY));
  const pinch = Gesture.Pinch()
    .onStart(() => runOnJS(captureStart)())
    .onUpdate(e => runOnJS(applyPinch)(e.scale));
  const gesture = Gesture.Exclusive(Gesture.Simultaneous(pan, pinch), tap);

  const onLayout = (e: LayoutChangeEvent) =>
    setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  return (
    <View style={styles.fill} onLayout={onLayout}>
      <GestureDetector gesture={gesture}>
        <View style={[styles.canvasWrap, { width: disp.W, height: disp.H }]}>
          {picture && <Canvas style={{ width: disp.W, height: disp.H }}><Picture picture={picture} /></Canvas>}
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  canvasWrap: { overflow: 'hidden' },
});
