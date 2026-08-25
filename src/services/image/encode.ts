import { Skia, ImageFormat, type SkImage, type SkSurface } from '@shopify/react-native-skia';
import RNFS from 'react-native-fs';

export type ImgFormat = 'jpg' | 'png' | 'webp';

const FMT: Record<ImgFormat, ImageFormat> = {
  jpg: ImageFormat.JPEG,
  png: ImageFormat.PNG,
  webp: ImageFormat.WEBP,
};

export const MIME: Record<ImgFormat, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** Metadata about a real, verified output file. */
export type EncodeResult = {
  uri: string;
  format: ImgFormat;
  mime: string;
  bytes: number;
};

/**
 * Encode a Skia image to a real file (true transcode, not a rename) and verify
 * the bytes actually landed on disk. Throws with a specific reason so callers
 * never report "saved" for a file that was never written.
 */
export async function encodeImage(
  image: SkImage,
  format: ImgFormat,
  quality = 92,
  namePrefix = 'img',
): Promise<EncodeResult> {
  // PNG is lossless — Skia ignores quality, so pin it to avoid confusing values.
  const q = format === 'png' ? 100 : Math.max(1, Math.min(100, Math.round(quality)));
  const base64 = image.encodeToBase64(FMT[format], q);
  if (!base64) {
    // Empty result = the platform's Skia build has no encoder for this format.
    throw new Error(`encode_unsupported_${format}`);
  }

  const path = `${RNFS.CachesDirectoryPath}/${namePrefix}_${Date.now()}.${format}`;
  await RNFS.writeFile(path, base64, 'base64');

  // Verify the file exists and is non-empty before claiming success.
  const stat = await RNFS.stat(path);
  const bytes = Number(stat.size) || 0;
  if (bytes <= 0) throw new Error('encode_empty_file');

  return { uri: `file://${path}`, format, mime: MIME[format], bytes };
}

/** Back-compat helper: encode and return just the file uri. */
export async function encodeImageToFile(
  image: SkImage,
  format: ImgFormat,
  quality = 92,
  namePrefix = 'img',
): Promise<string> {
  return (await encodeImage(image, format, quality, namePrefix)).uri;
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
