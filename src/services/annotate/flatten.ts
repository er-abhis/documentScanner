import {
  Skia,
  ImageFormat,
  PaintStyle,
  StrokeCap,
  StrokeJoin,
  BlendMode,
} from '@shopify/react-native-skia';
import RNFS from 'react-native-fs';
import type { Stroke } from './types';

/** Build a smoothed SkPath from normalized points scaled to (w,h) pixels. */
export function buildPath(points: { x: number; y: number }[], w: number, h: number) {
  const path = Skia.Path.Make();
  if (points.length === 0) return path;
  const p0 = points[0];
  path.moveTo(p0.x * w, p0.y * h);
  if (points.length === 1) {
    // a dot: tiny line so the round cap paints something
    path.lineTo(p0.x * w + 0.1, p0.y * h + 0.1);
    return path;
  }
  // quadratic smoothing through midpoints
  for (let i = 1; i < points.length - 1; i++) {
    const c = points[i];
    const n = points[i + 1];
    const mx = ((c.x + n.x) / 2) * w;
    const my = ((c.y + n.y) / 2) * h;
    path.quadTo(c.x * w, c.y * h, mx, my);
  }
  const last = points[points.length - 1];
  path.lineTo(last.x * w, last.y * h);
  return path;
}

export function strokePaint(stroke: Stroke, minSide: number) {
  const paint = Skia.Paint();
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeCap(StrokeCap.Round);
  paint.setStrokeJoin(StrokeJoin.Round);
  paint.setAntiAlias(true);
  paint.setStrokeWidth(stroke.width * minSide);
  const c = Skia.Color(stroke.color);
  paint.setColor(c);
  paint.setAlphaf(stroke.opacity);
  if (stroke.tool === 'highlight') paint.setBlendMode(BlendMode.Multiply);
  return paint;
}

/**
 * Flatten drawing strokes onto the source image at full resolution and write a
 * new JPEG to the cache dir. Returns the new file:// uri. Non-destructive: the
 * original file is untouched.
 */
export async function flattenAnnotations(
  uri: string,
  strokes: Stroke[],
  quality = 92,
): Promise<string> {
  const img = Skia.Image.MakeImageFromEncoded(await Skia.Data.fromURI(uri));
  if (!img) throw new Error('decode_failed');
  const w = img.width();
  const h = img.height();
  const minSide = Math.min(w, h);

  const surface = Skia.Surface.MakeOffscreen(w, h);
  if (!surface) throw new Error('surface_failed');
  const canvas = surface.getCanvas();
  canvas.drawImage(img, 0, 0);

  for (const s of strokes) {
    canvas.drawPath(buildPath(s.points, w, h), strokePaint(s, minSide));
  }
  surface.flush();

  const base64 = surface.makeImageSnapshot().encodeToBase64(ImageFormat.JPEG, quality);
  const path = `${RNFS.CachesDirectoryPath}/annotated_${Date.now()}.jpg`;
  await RNFS.writeFile(path, base64, 'base64');
  return `file://${path}`;
}
