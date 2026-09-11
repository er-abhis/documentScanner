import {
  Skia,
  PaintStyle,
  StrokeCap,
  StrokeJoin,
  BlendMode,
  ClipOp,
  TileMode,
  FilterMode,
  MipmapMode,
  type SkCanvas,
  type SkFont,
  type SkImage,
} from '@shopify/react-native-skia';
import type { Annotation, Pt, RedactItem, ShapeItem, Stroke } from './types';

/** Smoothed path from normalized points scaled to (w,h). */
export function buildStrokePath(points: Pt[], w: number, h: number) {
  const path = Skia.Path.Make();
  if (points.length === 0) return path;
  const p0 = points[0];
  path.moveTo(p0.x * w, p0.y * h);
  if (points.length === 1) {
    path.lineTo(p0.x * w + 0.1, p0.y * h + 0.1);
    return path;
  }
  for (let i = 1; i < points.length - 1; i++) {
    const c = points[i];
    const n = points[i + 1];
    path.quadTo(c.x * w, c.y * h, ((c.x + n.x) / 2) * w, ((c.y + n.y) / 2) * h);
  }
  const last = points[points.length - 1];
  path.lineTo(last.x * w, last.y * h);
  return path;
}

function strokePaint(color: string, widthPx: number, opacity: number, highlight = false) {
  const p = Skia.Paint();
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeCap(StrokeCap.Round);
  p.setStrokeJoin(StrokeJoin.Round);
  p.setAntiAlias(true);
  p.setStrokeWidth(widthPx);
  p.setColor(Skia.Color(color));
  p.setAlphaf(opacity);
  if (highlight) p.setBlendMode(BlendMode.Multiply);
  return p;
}

function drawShape(canvas: SkCanvas, s: ShapeItem, w: number, h: number, minSide: number) {
  const paint = strokePaint(s.color, s.width * minSide, s.opacity);
  const ax = s.a.x * w;
  const ay = s.a.y * h;
  const bx = s.b.x * w;
  const by = s.b.y * h;
  if (s.shape === 'rect') {
    canvas.drawRect(Skia.XYWHRect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay)), paint);
  } else if (s.shape === 'oval') {
    canvas.drawOval(Skia.XYWHRect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay)), paint);
  } else {
    canvas.drawLine(ax, ay, bx, by, paint);
    if (s.shape === 'arrow') {
      const angle = Math.atan2(by - ay, bx - ax);
      const head = s.width * minSide * 4 + 12;
      const a1 = angle + Math.PI - Math.PI / 7;
      const a2 = angle + Math.PI + Math.PI / 7;
      canvas.drawLine(bx, by, bx + head * Math.cos(a1), by + head * Math.sin(a1), paint);
      canvas.drawLine(bx, by, bx + head * Math.cos(a2), by + head * Math.sin(a2), paint);
    }
  }
}

function drawStroke(canvas: SkCanvas, s: Stroke, w: number, h: number, minSide: number) {
  canvas.drawPath(buildStrokePath(s.points, w, h), strokePaint(s.color, s.width * minSide, s.opacity, s.tool === 'highlight'));
}

/** Number of pixel blocks along the region's longer edge in 'pixel' mode. */
const PIXEL_BLOCKS = 14;

function drawRedact(canvas: SkCanvas, r: RedactItem, w: number, h: number, image?: SkImage | null) {
  const x = Math.min(r.a.x, r.b.x) * w;
  const y = Math.min(r.a.y, r.b.y) * h;
  const rw = Math.abs(r.b.x - r.a.x) * w;
  const rh = Math.abs(r.b.y - r.a.y) * h;
  if (rw < 1 || rh < 1) return;
  const dst = Skia.XYWHRect(x, y, rw, rh);

  // No image (e.g. PDF/collage) or explicit solid: opaque black box.
  if (r.mode === 'solid' || !image) {
    const p = Skia.Paint();
    p.setColor(Skia.Color('#000000'));
    canvas.drawRect(dst, p);
    return;
  }

  const iw = image.width();
  const ih = image.height();
  const src = Skia.XYWHRect(
    Math.min(r.a.x, r.b.x) * iw,
    Math.min(r.a.y, r.b.y) * ih,
    Math.abs(r.b.x - r.a.x) * iw,
    Math.abs(r.b.y - r.a.y) * ih,
  );

  if (r.mode === 'blur') {
    const sigma = Math.max(4, Math.max(rw, rh) * 0.08);
    const p = Skia.Paint();
    p.setImageFilter(Skia.ImageFilter.MakeBlur(sigma, sigma, TileMode.Clamp, null));
    canvas.save();
    canvas.clipRect(dst, ClipOp.Intersect, true);
    canvas.drawImageRect(image, src, dst, p);
    canvas.restore();
    return;
  }

  // pixel: downscale the region to a few blocks, then draw back with nearest
  // sampling so it reads as chunky mosaic.
  const dw = Math.max(1, PIXEL_BLOCKS);
  const dh = Math.max(1, Math.round(PIXEL_BLOCKS * (rh / rw)));
  const surf = Skia.Surface.MakeOffscreen(dw, dh);
  if (!surf) {
    const p = Skia.Paint();
    p.setColor(Skia.Color('#000000'));
    canvas.drawRect(dst, p);
    return;
  }
  surf.getCanvas().drawImageRect(image, src, Skia.XYWHRect(0, 0, dw, dh), Skia.Paint());
  surf.flush();
  const small = surf.makeImageSnapshot();
  canvas.save();
  canvas.clipRect(dst, ClipOp.Intersect, true);
  canvas.drawImageRectOptions(small, Skia.XYWHRect(0, 0, dw, dh), dst, FilterMode.Nearest, MipmapMode.None, null);
  canvas.restore();
}

/** Paint a list of annotations onto a canvas at (w,h) pixels. */
export function paintAnnotations(
  canvas: SkCanvas,
  w: number,
  h: number,
  annotations: Annotation[],
  font?: SkFont | null,
  makeFont?: (px: number) => SkFont | null,
  image?: SkImage | null,
) {
  const minSide = Math.min(w, h);
  for (const ann of annotations) {
    if (ann.kind === 'stroke') drawStroke(canvas, ann, w, h, minSide);
    else if (ann.kind === 'shape') drawShape(canvas, ann, w, h, minSide);
    else if (ann.kind === 'redact') drawRedact(canvas, ann, w, h, image);
    else {
      const px = ann.size * minSide;
      const f = makeFont ? makeFont(px) : font;
      if (!f) continue;
      const p = Skia.Paint();
      p.setColor(Skia.Color(ann.color));
      p.setAlphaf(ann.opacity);
      p.setAntiAlias(true);
      canvas.drawText(ann.text, ann.x * w, ann.y * h + px, p, f);
    }
  }
}
