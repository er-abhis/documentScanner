import { PDFDocument } from 'pdf-lib';
import RNFS from 'react-native-fs';

const strip = (uri: string) => uri.replace(/^file:\/\//, '');

/**
 * Build a multi-page PDF from JPEG page files (order preserved). Each page is
 * sized to its image so orientation/aspect are correct; the JPEG bytes are
 * embedded as-is (no re-encode) to keep the file small. Returns base64.
 */
export async function buildPdfBase64(pagePaths: string[]): Promise<string> {
  const pdf = await PDFDocument.create();
  for (const p of pagePaths) {
    const b64 = await RNFS.readFile(strip(p), 'base64');
    const img = await pdf.embedJpg(b64);
    const page = pdf.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  return pdf.saveAsBase64();
}
