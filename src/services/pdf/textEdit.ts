import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import RNFS from 'react-native-fs';

/**
 * A single best-effort text edit located via pdf.js (real font/size/position
 * detection). NOTE: free tooling cannot rewrite the original content stream, so
 * this is applied as an OVERLAY — the run's box is covered and the replacement
 * is drawn in the closest standard font. The rest of the page stays vector (no
 * rasterization). Honest limitation: assumes a light page background.
 */
export type PdfTextEdit = {
  page: number; // 1-based
  x: number; // PDF points, left
  yTop: number; // PDF points from top of page (pdf.js viewport space)
  w: number; // run width, PDF points
  fontSize: number; // PDF points
  fontName: string;
  newText: string | null; // null = delete (cover only)
  color?: string; // hex, default near-black
};

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function pickFont(fontName: string) {
  const n = fontName.toLowerCase();
  const bold = /bold|black|heavy|semibold/.test(n);
  const italic = /italic|oblique/.test(n);
  if (/times|serif|georgia|roman|minion|garamond/.test(n)) {
    if (bold && italic) return StandardFonts.TimesRomanBoldItalic;
    if (bold) return StandardFonts.TimesRomanBold;
    if (italic) return StandardFonts.TimesRomanItalic;
    return StandardFonts.TimesRoman;
  }
  if (/courier|mono|consol/.test(n)) {
    if (bold && italic) return StandardFonts.CourierBoldOblique;
    if (bold) return StandardFonts.CourierBold;
    if (italic) return StandardFonts.CourierOblique;
    return StandardFonts.Courier;
  }
  if (bold && italic) return StandardFonts.HelveticaBoldOblique;
  if (bold) return StandardFonts.HelveticaBold;
  if (italic) return StandardFonts.HelveticaOblique;
  return StandardFonts.Helvetica;
}

/**
 * Apply overlay text edits to a PDF (given as file:// uri) and write a new PDF
 * to the cache dir. Returns the new file:// uri. Non-destructive.
 */
export async function applyTextEdits(pdfUri: string, edits: PdfTextEdit[]): Promise<string> {
  const base64 = await RNFS.readFile(pdfUri.replace(/^file:\/\//, ''), 'base64');
  const pdf = await PDFDocument.load(base64);
  const pages = pdf.getPages();
  const fontCache = new Map<string, Awaited<ReturnType<typeof pdf.embedFont>>>();

  for (const e of edits) {
    const page = pages[e.page - 1];
    if (!page) continue;
    const pageH = page.getHeight();
    const baseline = pageH - e.yTop;
    const pad = e.fontSize * 0.15;

    // cover the original run (light-background assumption)
    page.drawRectangle({
      x: e.x - pad,
      y: baseline - e.fontSize * 0.28,
      width: e.w + pad * 2,
      height: e.fontSize * 1.25,
      color: rgb(1, 1, 1),
    });

    if (e.newText && e.newText.length) {
      const key = pickFont(e.fontName);
      let font = fontCache.get(key);
      if (!font) {
        font = await pdf.embedFont(key);
        fontCache.set(key, font);
      }
      page.drawText(e.newText, {
        x: e.x,
        y: baseline,
        size: e.fontSize,
        font,
        color: hexToRgb(e.color ?? '#111111'),
      });
    }
  }

  const out = await pdf.saveAsBase64();
  const path = `${RNFS.CachesDirectoryPath}/edited_${Date.now()}.pdf`;
  await RNFS.writeFile(path, out, 'base64');
  return `file://${path}`;
}
