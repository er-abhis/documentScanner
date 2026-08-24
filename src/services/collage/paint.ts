import {
  Skia,
  PaintStyle,
  ClipOp,
  BlurStyle,
  type SkCanvas,
  type SkImage,
  type SkFont,
} from '@shopify/react-native-skia';
import type { CollageProject, Frame, Template } from './types';

export type PaintArgs = {
  template: Template;
  project: CollageProject;
  /** decoded images keyed by uri */
  images: Record<string, SkImage | undefined>;
  /** font for text + "Add Photo" placeholder (optional) */
  font?: SkFont | null;
  /** frame id currently selected (draws a highlight) — omit for export */
  selectedId?: string | null;
  brand?: string;
};

/** pixel rect of a frame after spacing/margin inset */
function frameRect(frame: Frame, W: number, H: number, gap: number) {
  const x = frame.x * W + gap;
  const y = frame.y * H + gap;
  const w = frame.w * W - gap * 2;
  const h = frame.h * H - gap * 2;
  return { x, y, w: Math.max(1, w), h: Math.max(1, h) };
}

/**
 * Paint the entire collage onto a Skia canvas at (W,H) pixels. Used verbatim by
 * the live preview (via a recorded Picture) and by the exporter (offscreen
 * surface), so what you see is what you export.
 */
export function paintCollage(canvas: SkCanvas, W: number, H: number, args: PaintArgs) {
  const { template, project, images, font, selectedId, brand = '#2B6BE4' } = args;
  const { style } = project;
  const minSide = Math.min(W, H);
  const gap = (style.spacing * minSide) / 2;

  canvas.clear(Skia.Color(style.background));

  const frames = [...template.frames].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));

  for (const frame of frames) {
    let r = frameRect(frame, W, H, gap);
    const fill = project.fills[frame.id];
    const img = fill?.uri ? images[fill.uri] : undefined;

    canvas.save();
    if (frame.rotation) {
      canvas.rotate(frame.rotation, r.x + r.w / 2, r.y + r.h / 2);
    }

    // frame style mats / shadow
    if (style.frameStyle === 'shadow') {
      drawShadow(canvas, r);
    }
    let inner = r;
    if (style.frameStyle === 'white' || style.frameStyle === 'polaroid') {
      const matPaint = Skia.Paint();
      matPaint.setColor(Skia.Color('#FFFFFF'));
      const border = minSide * 0.012;
      const bottom = style.frameStyle === 'polaroid' ? minSide * 0.06 : border;
      canvas.drawRRect(rrect(r, minSide * 0.01), matPaint);
      inner = { x: r.x + border, y: r.y + border, w: r.w - border * 2, h: r.h - border - bottom };
    }

    const radius = (style.cornerRadius + (frame.radius ?? 0)) * Math.min(inner.w, inner.h);
    const clip = rrect(inner, radius);
    canvas.save();
    canvas.clipRRect(clip, ClipOp.Intersect, true);

    if (img) {
      drawCover(canvas, img, inner, fill?.scale ?? 1, fill?.tx ?? 0, fill?.ty ?? 0);
    } else {
      drawPlaceholder(canvas, inner, font);
    }
    canvas.restore(); // clip

    // selection highlight
    if (selectedId === frame.id) {
      const sel = Skia.Paint();
      sel.setStyle(PaintStyle.Stroke);
      sel.setStrokeWidth(minSide * 0.008);
      sel.setColor(Skia.Color(brand));
      canvas.drawRRect(rrect(inner, radius), sel);
    }
    canvas.restore(); // rotation
  }

  // text layers
  if (font) {
    for (const t of project.texts) {
      const paint = Skia.Paint();
      paint.setColor(Skia.Color(t.color));
      paint.setAlphaf(t.opacity);
      const px = t.x * W;
      const py = t.y * H;
      canvas.drawText(t.text, px, py, paint, font);
    }
  }
}

function rrect(r: { x: number; y: number; w: number; h: number }, radius: number) {
  return Skia.RRectXY(Skia.XYWHRect(r.x, r.y, r.w, r.h), radius, radius);
}

function drawCover(
  canvas: SkCanvas,
  img: SkImage,
  r: { x: number; y: number; w: number; h: number },
  scale: number,
  tx: number,
  ty: number,
) {
  const iw = img.width();
  const ih = img.height();
  const base = Math.max(r.w / iw, r.h / ih);
  const s = base * Math.max(scale, 1);
  const dw = iw * s;
  const dh = ih * s;
  // clamp pan so the image keeps covering the frame
  const maxX = (dw - r.w) / 2;
  const maxY = (dh - r.h) / 2;
  const ox = Math.max(-maxX, Math.min(maxX, tx * r.w));
  const oy = Math.max(-maxY, Math.min(maxY, ty * r.h));
  const dx = r.x + (r.w - dw) / 2 + ox;
  const dy = r.y + (r.h - dh) / 2 + oy;
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  canvas.drawImageRect(
    img,
    Skia.XYWHRect(0, 0, iw, ih),
    Skia.XYWHRect(dx, dy, dw, dh),
    paint,
  );
}

function drawPlaceholder(
  canvas: SkCanvas,
  r: { x: number; y: number; w: number; h: number },
  font?: SkFont | null,
) {
  const bg = Skia.Paint();
  bg.setColor(Skia.Color('#EEF0F3'));
  canvas.drawRect(Skia.XYWHRect(r.x, r.y, r.w, r.h), bg);
  // plus sign
  const plus = Skia.Paint();
  plus.setStyle(PaintStyle.Stroke);
  plus.setColor(Skia.Color('#9AA3AF'));
  const s = Math.min(r.w, r.h) * 0.12;
  plus.setStrokeWidth(Math.max(2, s * 0.14));
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  canvas.drawLine(cx - s / 2, cy, cx + s / 2, cy, plus);
  canvas.drawLine(cx, cy - s / 2, cx, cy + s / 2, plus);
  if (font) {
    const tp = Skia.Paint();
    tp.setColor(Skia.Color('#9AA3AF'));
    const label = 'Add Photo';
    const tw = font.getTextWidth(label);
    canvas.drawText(label, cx - tw / 2, cy + s, tp, font);
  }
}

function drawShadow(canvas: SkCanvas, r: { x: number; y: number; w: number; h: number }) {
  const p = Skia.Paint();
  p.setColor(Skia.Color('#00000030'));
  const blur = Math.min(r.w, r.h) * 0.04;
  p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, blur, false));
  canvas.drawRRect(rrect({ x: r.x, y: r.y + blur * 0.4, w: r.w, h: r.h }, blur), p);
}
