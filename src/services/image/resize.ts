import { Skia } from '@shopify/react-native-skia';
import { encodeImage, type EncodeResult, type ImgFormat } from './encode';

export type ResizeRatio = 'original' | '1:1' | '4:3' | '3:4' | '16:9' | '9:16';

const RATIO_AR: Record<Exclude<ResizeRatio, 'original'>, number> = {
  '1:1': 1,
  '4:3': 4 / 3,
  '3:4': 3 / 4,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
};

export type ProcessOptions = {
  /** 0.05–1 scale of the (optionally ratio-cropped) image; never upscaled past 1 */
  scale?: number;
  ratio?: ResizeRatio;
  format?: ImgFormat;
  quality?: number;
  /** Exact output pixels. When set, overrides ratio/scale (cover-crop, no distortion). */
  target?: { w: number; h: number };
};

/** center-crop rect of (iw,ih) matching target aspect ratio ar (w/h) */
function cropForRatio(iw: number, ih: number, ar: number) {
  const srcAr = iw / ih;
  if (srcAr > ar) {
    const w = ih * ar; // too wide -> crop width
    return { x: (iw - w) / 2, y: 0, w, h: ih };
  }
  const h = iw / ar; // too tall -> crop height
  return { x: 0, y: (ih - h) / 2, w: iw, h };
}

/**
 * Pure-math preview of what {@link processToImage} will output for a source of
 * (iw × ih). Lets the UI show real output dimensions before encoding.
 */
export function computeOutputDims(
  iw: number,
  ih: number,
  ratio: ResizeRatio,
  scale: number,
  target?: { w: number; h: number },
) {
  if (target) return { w: Math.max(1, Math.round(target.w)), h: Math.max(1, Math.round(target.h)) };
  const crop = ratio === 'original' ? { w: iw, h: ih } : cropForRatio(iw, ih, RATIO_AR[ratio]);
  const s = Math.max(0.05, Math.min(1, scale));
  return {
    w: Math.max(1, Math.round(crop.w * s)),
    h: Math.max(1, Math.round(crop.h * s)),
  };
}

/**
 * Resize (by % and/or aspect ratio) and re-encode an image in one pass.
 * Returns a verified output file (uri + real byte size + format/mime).
 * Ratio ≠ original center-crops to that aspect; scale then shrinks the result.
 * Never upscales beyond the source.
 */
export async function processToImage(uri: string, opts: ProcessOptions = {}): Promise<EncodeResult> {
  const { scale = 1, ratio = 'original', format = 'jpg', quality = 92, target } = opts;

  const data = await Skia.Data.fromURI(uri);
  const img = Skia.Image.MakeImageFromEncoded(data);
  if (!img) throw new Error('decode_failed');
  const iw = img.width();
  const ih = img.height();

  // Exact-dimensions path: cover-crop the source to the target aspect, then
  // draw into a target-sized surface. Used for custom width×height (e.g. exam
  // photo specs). May upscale to hit the requested pixels.
  if (target) {
    const outW = Math.max(1, Math.round(target.w));
    const outH = Math.max(1, Math.round(target.h));
    const crop = cropForRatio(iw, ih, outW / outH);
    const surface = Skia.Surface.MakeOffscreen(outW, outH);
    if (!surface) throw new Error('surface_failed');
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    surface.getCanvas().drawImageRect(
      img,
      Skia.XYWHRect(crop.x, crop.y, crop.w, crop.h),
      Skia.XYWHRect(0, 0, outW, outH),
      paint,
    );
    surface.flush();
    return encodeImage(surface.makeImageSnapshot(), format, quality, 'converted');
  }

  const s = Math.max(0.05, Math.min(1, scale));

  // Fast path: no crop and no downscale = pure format transcode. Skips the
  // offscreen surface entirely, so full-resolution photos (which can exceed the
  // GPU max-texture size and make MakeOffscreen fail) always convert reliably.
  if (ratio === 'original' && s >= 1) {
    return encodeImage(img, format, quality, 'converted');
  }

  const crop = ratio === 'original' ? { x: 0, y: 0, w: iw, h: ih } : cropForRatio(iw, ih, RATIO_AR[ratio]);
  const outW = Math.max(1, Math.round(crop.w * s));
  const outH = Math.max(1, Math.round(crop.h * s));

  const surface = Skia.Surface.MakeOffscreen(outW, outH);
  if (!surface) throw new Error('surface_failed');
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  surface.getCanvas().drawImageRect(
    img,
    Skia.XYWHRect(crop.x, crop.y, crop.w, crop.h),
    Skia.XYWHRect(0, 0, outW, outH),
    paint,
  );
  surface.flush();

  return encodeImage(surface.makeImageSnapshot(), format, quality, 'converted');
}

/** Back-compat: same pipeline, returns just the output uri. */
export async function processToFile(uri: string, opts: ProcessOptions = {}): Promise<string> {
  return (await processToImage(uri, opts)).uri;
}
