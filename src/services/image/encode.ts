import { Skia, ImageFormat, type SkImage, type SkSurface } from '@shopify/react-native-skia';
import RNFS from 'react-native-fs';

export type ImgFormat = 'jpg' | 'png' | 'webp';

const FMT: Record<ImgFormat, ImageFormat> = {
  jpg: ImageFormat.JPEG,
  png: ImageFormat.PNG,
  webp: ImageFormat.WEBP,
};

/** Encode a Skia image to a real file (true transcode, not a rename). */
export async function encodeImageToFile(
  image: SkImage,
  format: ImgFormat,
  quality = 92,
  namePrefix = 'img',
): Promise<string> {
  const base64 = image.encodeToBase64(FMT[format], quality);
  const path = `${RNFS.CachesDirectoryPath}/${namePrefix}_${Date.now()}.${format}`;
  await RNFS.writeFile(path, base64, 'base64');
  return `file://${path}`;
}

export async function encodeSurfaceToFile(
  surface: SkSurface,
  format: ImgFormat,
  quality = 92,
  namePrefix = 'img',
): Promise<string> {
  surface.flush();
  return encodeImageToFile(surface.makeImageSnapshot(), format, quality, namePrefix);
}

/** Transcode an existing image file to another format at the given quality. */
export async function convertImageFile(
  uri: string,
  format: ImgFormat,
  quality = 92,
): Promise<string> {
  const img = Skia.Image.MakeImageFromEncoded(await Skia.Data.fromURI(uri));
  if (!img) throw new Error('decode_failed');
  return encodeImageToFile(img, format, quality, 'convert');
}
