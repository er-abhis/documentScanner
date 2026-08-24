import { NativeModules } from 'react-native';

const { PdfRaster } = NativeModules as {
  PdfRaster?: {
    rasterize(uri: string, scale: number): Promise<string[]>;
    pageCount(uri: string): Promise<number>;
  };
};

/**
 * Render each page of a PDF (file:// or content://) to a JPEG in the cache dir
 * and return the file:// uris. `scale` multiplies the PDF's point size — 2 ≈
 * 144dpi, enough to view/annotate crisply without huge bitmaps.
 */
export async function rasterizePdf(uri: string, scale = 2): Promise<string[]> {
  if (!PdfRaster) throw new Error('PdfRaster native module unavailable');
  return PdfRaster.rasterize(uri, scale);
}

export async function pdfPageCount(uri: string): Promise<number> {
  if (!PdfRaster) throw new Error('PdfRaster native module unavailable');
  return PdfRaster.pageCount(uri);
}
