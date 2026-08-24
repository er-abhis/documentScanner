import { Skia, ImageFormat } from '@shopify/react-native-skia';
import RNFS from 'react-native-fs';

/**
 * Rotate a JPEG by 0/90/180/270° and write a new file to the cache dir.
 * Returns the new file:// uri (or the original uri if deg normalizes to 0).
 */
export async function rotateImage(uri: string, deg: number): Promise<string> {
  const d = ((deg % 360) + 360) % 360;
  if (d === 0) return uri;

  const img = Skia.Image.MakeImageFromEncoded(await Skia.Data.fromURI(uri));
  if (!img) throw new Error('decode_failed');
  const w = img.width();
  const h = img.height();
  const swap = d === 90 || d === 270;

  const surface = Skia.Surface.MakeOffscreen(swap ? h : w, swap ? w : h);
  if (!surface) throw new Error('surface_failed');
  const canvas = surface.getCanvas();
  if (d === 90) canvas.translate(h, 0);
  else if (d === 180) canvas.translate(w, h);
  else canvas.translate(0, w); // 270
  canvas.rotate(d, 0, 0);
  canvas.drawImage(img, 0, 0);
  surface.flush();

  const base64 = surface.makeImageSnapshot().encodeToBase64(ImageFormat.JPEG, 92);
  const path = `${RNFS.CachesDirectoryPath}/rot_${Date.now()}_${Math.round(w)}.jpg`;
  await RNFS.writeFile(path, base64, 'base64');
  return `file://${path}`;
}
