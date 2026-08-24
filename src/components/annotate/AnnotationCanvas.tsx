import { useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import {
  Canvas,
  Image as SkiaImage,
  Path,
  Group,
  useImage,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { buildPath } from '../../services/annotate/flatten';
import type { Pt, Stroke, StrokeTool } from '../../services/annotate/types';

type Props = {
  uri: string;
  strokes: Stroke[];
  tool: StrokeTool | 'erase' | 'view';
  color: string;
  /** width fraction of the smaller side */
  width: number;
  opacity: number;
  onCommit: (s: Stroke) => void;
  onErase: (pt: Pt) => void;
};

let strokeSeq = 0;

/**
 * Reusable drawing surface: renders a background image and vector strokes on a
 * Skia canvas, and captures freehand input. Strokes are stored in normalized
 * [0,1] coords (see annotate/types) so the same data flattens onto full-res
 * output. Erase mode reports the touch point; the parent removes hit strokes.
 *
 * ponytail: live stroke kept in React state — fine for typical use; if drawing
 * hundreds of dense strokes lags, move the in-progress path to a Skia value.
 */
export function AnnotationCanvas({
  uri,
  strokes,
  tool,
  color,
  width,
  opacity,
  onCommit,
  onErase,
}: Props) {
  const image = useImage(uri);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [live, setLive] = useState<Pt[]>([]);

  // fit the image into the box (contain) -> the content rect strokes map to
  const rect = useMemo(() => {
    if (!image || box.w === 0) return null;
    const iw = image.width();
    const ih = image.height();
    const scale = Math.min(box.w / iw, box.h / ih);
    const w = iw * scale;
    const h = ih * scale;
    return { x: (box.w - w) / 2, y: (box.h - h) / 2, w, h };
  }, [image, box]);

  const onLayout = (e: LayoutChangeEvent) =>
    setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  const norm = (x: number, y: number): Pt | null => {
    if (!rect) return null;
    const nx = (x - rect.x) / rect.w;
    const ny = (y - rect.y) / rect.h;
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return null;
    return { x: nx, y: ny };
  };

  const begin = (x: number, y: number) => {
    if (tool === 'view') return;
    if (tool === 'erase') {
      const p = norm(x, y);
      if (p) onErase(p);
      return;
    }
    const p = norm(x, y);
    if (p) setLive([p]);
  };
  const extend = (x: number, y: number) => {
    if (tool === 'view') return;
    if (tool === 'erase') {
      const p = norm(x, y);
      if (p) onErase(p);
      return;
    }
    const p = norm(x, y);
    if (p) setLive(prev => (prev.length ? [...prev, p] : [p]));
  };
  const end = () => {
    if (tool === 'erase') return;
    setLive(prev => {
      if (prev.length) {
        onCommit({
          id: `s${strokeSeq++}`,
          tool: tool as StrokeTool,
          color,
          width,
          opacity,
          points: prev,
        });
      }
      return [];
    });
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin(e => runOnJS(begin)(e.x, e.y))
    .onUpdate(e => runOnJS(extend)(e.x, e.y))
    .onEnd(() => runOnJS(end)())
    .onFinalize(() => runOnJS(end)());

  const minSide = rect ? Math.min(rect.w, rect.h) : 0;

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.fill} onLayout={onLayout}>
        <Canvas style={styles.fill}>
          {image && rect && (
            <SkiaImage image={image} x={rect.x} y={rect.y} width={rect.w} height={rect.h} fit="fill" />
          )}
          {rect &&
            strokes.map(s => (
              <Group key={s.id} layer={s.tool === 'highlight'} blendMode={s.tool === 'highlight' ? 'multiply' : undefined}>
                <Path
                  path={pathFor(s.points, rect.x, rect.y, rect.w, rect.h)}
                  style="stroke"
                  color={s.color}
                  strokeWidth={s.width * minSide}
                  strokeCap="round"
                  strokeJoin="round"
                  opacity={s.opacity}
                />
              </Group>
            ))}
          {rect && live.length > 0 && tool !== 'erase' && (
            <Path
              path={pathFor(live, rect.x, rect.y, rect.w, rect.h)}
              style="stroke"
              color={color}
              strokeWidth={width * minSide}
              strokeCap="round"
              strokeJoin="round"
              opacity={opacity}
            />
          )}
        </Canvas>
      </View>
    </GestureDetector>
  );
}

/** build path in the content rect's screen coords (offset by rect origin) */
function pathFor(points: Pt[], ox: number, oy: number, w: number, h: number) {
  const p = buildPath(points, w, h);
  p.offset(ox, oy);
  return p;
}

const styles = StyleSheet.create({
  fill: { flex: 1, width: '100%' },
});
