import TextRecognition from '@react-native-ml-kit/text-recognition';
import { rasterizePdf } from '../pdf/raster';

/** On-device OCR (Google ML Kit, free, offline) for a single image. */
export async function ocrImage(uri: string): Promise<string> {
  const res = await TextRecognition.recognize(uri);
  return res.text ?? '';
}

/**
 * OCR every page of a (scanned/image) PDF. Rasterizes at ~2× for legibility,
 * then recognizes each page. Returns the per-page text.
 */
export async function ocrPdf(
  uri: string,
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  const pages = await rasterizePdf(uri, 2);
  const out: string[] = [];
  for (let i = 0; i < pages.length; i++) {
    const res = await TextRecognition.recognize(pages[i]);
    out.push(res.text ?? '');
    onProgress?.(i + 1, pages.length);
  }
  return out;
}
