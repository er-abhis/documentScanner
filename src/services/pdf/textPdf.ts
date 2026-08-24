import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import RNFS from 'react-native-fs';

const W = 595, H = 842, MARGIN = 48, SIZE = 11, LH = 16; // A4

// StandardFonts encode WinAnsi (latin-1); drop glyphs it can't render.
const sanitize = (s: string) => s.replace(/[^\x00-\xFF]/g, '');

/** Build a real (searchable) text PDF from plain text, wrapping + paginating. */
export async function buildTextPdf(text: string): Promise<string> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const maxW = W - MARGIN * 2;

  const wrap = (para: string): string[] => {
    const words = sanitize(para).split(/\s+/);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (cur && font.widthOfTextAtSize(t, SIZE) > maxW) {
        lines.push(cur);
        cur = w;
      } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  };

  let page = pdf.addPage([W, H]);
  let y = H - MARGIN;
  for (const para of text.split(/\n/)) {
    for (const line of wrap(para)) {
      if (y < MARGIN) {
        page = pdf.addPage([W, H]);
        y = H - MARGIN;
      }
      page.drawText(line, { x: MARGIN, y, size: SIZE, font, color: rgb(0.1, 0.1, 0.1) });
      y -= LH;
    }
  }

  const b64 = await pdf.saveAsBase64();
  const path = `${RNFS.CachesDirectoryPath}/ocr_${Date.now()}.pdf`;
  await RNFS.writeFile(path, b64, 'base64');
  return `file://${path}`;
}
