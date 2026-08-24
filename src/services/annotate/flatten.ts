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
  const w = img.width();
  const h = img.height();

  const surface = Skia.Surface.MakeOffscreen(w, h);
  if (!surface) throw new Error('surface_failed');
  const canvas = surface.getCanvas();
  canvas.drawImage(img, 0, 0);
  paintAnnotations(canvas, w, h, annotations, null, px => systemFont(px));
  surface.flush();

  const base64 = surface.makeImageSnapshot().encodeToBase64(ImageFormat.JPEG, quality);
  const path = `${RNFS.CachesDirectoryPath}/annotated_${Date.now()}.jpg`;
  await RNFS.writeFile(path, base64, 'base64');
  return `file://${path}`;
}
