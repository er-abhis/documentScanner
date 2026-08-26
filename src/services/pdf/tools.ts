import { PDFDocument } from 'pdf-lib';
import RNFS from 'react-native-fs';
import RNPrint from 'react-native-print';
import { rasterizePdf } from './raster';
import { buildPdfBase64 } from './index';
import { processToImage } from '../image/resize';

const strip = (uri: string) => uri.replace(/^file:\/\//, '');
const stamp = () => `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

async function fileBytes(path: string): Promise<number> {
  const stat = await RNFS.stat(strip(path));
  return Number(stat.size) || 0;
}

/** Open the system print dialog for a local PDF. */
export async function printPdf(uri: string): Promise<void> {
  // RNPrint needs a plain filesystem path (no file:// scheme) on Android.
  await RNPrint.print({ filePath: strip(uri) });
}

/**
 * Extract a 1-based inclusive page range into a new PDF (vector-preserving, via
 * pdf-lib copyPages). Returns the new file uri + byte size.
 */
export async function splitPdfRange(
  uri: string,
  from: number,
  to: number,
  baseName: string,
): Promise<{ uri: string; bytes: number; pages: number }> {
  const b64 = await RNFS.readFile(strip(uri), 'base64');
  const src = await PDFDocument.load(b64);
  const total = src.getPageCount();
  const start = Math.max(1, Math.min(from, total));
  const end = Math.max(start, Math.min(to, total));
  const indices = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);

  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, indices);
  copied.forEach(p => out.addPage(p));

  const outB64 = await out.saveAsBase64();
  const name = `${baseName}_p${start}-${end}.pdf`;
  const path = `${RNFS.CachesDirectoryPath}/${name}`;
  await RNFS.writeFile(path, outB64, 'base64');
  return { uri: `file://${path}`, bytes: await fileBytes(path), pages: indices.length };
}

/**
 * Rasterize every PDF page to a JPEG. `scale` multiplies the PDF point size
 * (2 ≈ 144dpi). Returns file:// uris in page order.
 */
export async function pdfToImages(uri: string, scale = 2): Promise<string[]> {
  return rasterizePdf(uri, scale);
}

/**
 * Reduce a PDF's file size by rasterizing each page at a lower resolution and
 * re-encoding as JPEG at the given quality, then rebuilding the PDF. Effective
 * for scanned / image-heavy PDFs (the app's own output). Vector text is
 * flattened to an image, so it's offered as an explicit "reduce size" action.
 */
export async function compressPdf(
  uri: string,
  opts: { scale?: number; quality?: number; baseName?: string } = {},
): Promise<{ uri: string; bytes: number }> {
  const { scale = 1.4, quality = 60, baseName = 'compressed' } = opts;
  const rasters = await rasterizePdf(uri, scale);
  if (!rasters.length) throw new Error('rasterize_failed');

  const jpgs: string[] = [];
  try {
    for (const r of rasters) {
      const enc = await processToImage(r, { format: 'jpg', quality });
      jpgs.push(enc.uri);
    }
    const b64 = await buildPdfBase64(jpgs);
    const path = `${RNFS.CachesDirectoryPath}/${baseName}_${stamp()}.pdf`;
    await RNFS.writeFile(path, b64, 'base64');
    return { uri: `file://${path}`, bytes: await fileBytes(path) };
  } finally {
    for (const f of [...rasters, ...jpgs]) {
      try { await RNFS.unlink(strip(f)); } catch {}
    }
  }
}
