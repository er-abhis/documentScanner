import { Skia, ImageFormat } from '@shopify/react-native-skia';
import RNFS from 'react-native-fs';
import type { Annotation } from './types';
import { paintAnnotations } from './paint';
import { systemFont } from './font';

/**
 * Flatten annotations (strokes, shapes, text) onto the source image at full
 * resolution and write a new JPEG to the cache dir. Returns the new file:// uri.
 * Non-destructive: the original file is untouched.
 */
export async function flattenAnnotations(
  uri: string,
  annotations: Annotation[],
  quality = 92,
): Promise<string> {
  const img = Skia.Image.MakeImageFromEncoded(await Skia.Data.fromURI(uri));
  if (!img) throw new Error('decode_failed');
  // ponytail: flatten at capped resolution — a 12MP+ photo at full size OOMs the
  // offscreen surface. Downscale past 4096px longest side; annotations use
  // normalized coords so they land correctly at any working size.
  const MAX_SIDE = 4096;
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width(), img.height()));
  const w = Math.round(img.width() * scale);
  const h = Math.round(img.height() * scale);

  const surface = Skia.Surface.MakeOffscreen(w, h);
  if (!surface) throw new Error('surface_failed');
  const canvas = surface.getCanvas();
  canvas.drawImageRect(
    img,
    Skia.XYWHRect(0, 0, img.width(), img.height()),
    Skia.XYWHRect(0, 0, w, h),
    Skia.Paint(),
  );
  paintAnnotations(canvas, w, h, annotations, null, px => systemFont(px), img);
  surface.flush();

  const base64 = surface.makeImageSnapshot().encodeToBase64(ImageFormat.JPEG, quality);
  const path = `${RNFS.CachesDirectoryPath}/annotated_${Date.now()}.jpg`;
  await RNFS.writeFile(path, base64, 'base64');
  return `file://${path}`;
}
