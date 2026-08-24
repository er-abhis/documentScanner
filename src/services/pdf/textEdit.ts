import { PDFDocument, PDFName, PDFArray, PDFRawStream, PDFRef, decodePDFRawStream, StandardFonts, rgb } from 'pdf-lib';
import RNFS from 'react-native-fs';

/**
 * A text edit located via pdf.js. `orig` is the exact original run text (used to
 * find it in the page content stream). Where the run is stored as a plain
 * literal/hex Tj string in a standard-encoded font, we do a REAL content-stream
 * replacement (original glyphs removed, page stays vector/searchable). When the
 * run can't be matched (subset font with custom encoding, TJ arrays, split
 * runs) we fall back to an overlay (cover + redraw) — clearly the best-effort
 * case, never claimed as native editing.
 */
export type PdfTextEdit = {
  page: number; // 1-based
  orig: string; // original run text (for content-stream matching)
  newText: string | null; // null = delete
  x: number;
  yTop: number;
  w: number;
  fontSize: number;
  fontName: string;
  color?: string;
};

// RN has no Buffer — do latin1 <-> hex manually.
const hex = (s: string) => {
  let h = '';
  for (let i = 0; i < s.length; i++) h += (s.charCodeAt(i) & 0xff).toString(16).padStart(2, '0');
  return h;
};
const bytesToLatin1 = (u8: Uint8Array) => {
  let s = '';
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return s;
};
const escLit = (s: string) => s.replace(/([\\()])/g, '\\$1');

function hexToRgb(hexColor: string) {
  const h = hexColor.replace('#', '');
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

/** Try to remove/replace a run directly in the page content stream. */
function tryStreamEdit(page: ReturnType<PDFDocument['getPages']>[number], orig: string, newText: string | null): boolean {
  const ctx = page.node.context;
  const contentsRaw = page.node.get(PDFName.of('Contents'));
  if (!contentsRaw) return false;
  const looked = ctx.lookup(contentsRaw);
  const refs: any[] = looked instanceof PDFArray ? looked.asArray() : contentsRaw instanceof PDFRef ? [contentsRaw] : [];
  const origHex = hex(orig);
  const newHex = newText == null ? '' : hex(newText);
  const litOrig = `(${escLit(orig)})`;

  for (const ref of refs) {
    const s = ctx.lookup(ref);
    if (!(s instanceof PDFRawStream)) continue;
    let str: string;
    try {
      str = bytesToLatin1(decodePDFRawStream(s).decode());
    } catch {
      continue;
    }
    const hexRe = new RegExp('<' + origHex + '>\\s*Tj', 'i');
    if (hexRe.test(str)) {
      str = str.replace(hexRe, newText == null ? '' : `<${newHex}> Tj`);
      ctx.assign(ref, ctx.stream(str));
      return true;
    }
    const litIdx = str.indexOf(`${litOrig} Tj`);
    if (litIdx >= 0 || str.includes(`${litOrig}Tj`)) {
      str = str.replace(`${litOrig}`, newText == null ? '()' : `(${escLit(newText)})`);
      ctx.assign(ref, ctx.stream(str));
      return true;
    }
  }
  return false;
}

export async function applyTextEdits(pdfUri: string, edits: PdfTextEdit[]): Promise<string> {
  const base64 = await RNFS.readFile(pdfUri.replace(/^file:\/\//, ''), 'base64');
  const pdf = await PDFDocument.load(base64);
  const pages = pdf.getPages();
  const fontCache = new Map<string, Awaited<ReturnType<typeof pdf.embedFont>>>();

  for (const e of edits) {
    const page = pages[e.page - 1];
    if (!page) continue;

    // 1) try REAL content-stream edit (removes original, keeps vector)
    if (tryStreamEdit(page, e.orig, e.newText)) continue;

    // 2) fallback: overlay (cover the run + redraw in closest standard font)
    const pageH = page.getHeight();
    const baseline = pageH - e.yTop;
    const pad = e.fontSize * 0.15;
    page.drawRectangle({
      x: e.x - pad,
      y: baseline - e.fontSize * 0.28,
      width: e.w + pad * 2,
      height: e.fontSize * 1.25,
      color: rgb(1, 1, 1),
    });
    if (e.newText) {
      const key = pickFont(e.fontName);
      let font = fontCache.get(key);
      if (!font) {
        font = await pdf.embedFont(key);
        fontCache.set(key, font);
      }
      page.drawText(e.newText, { x: e.x, y: baseline, size: e.fontSize, font, color: hexToRgb(e.color ?? '#111111') });
    }
  }

  const out = await pdf.saveAsBase64();
  const path = `${RNFS.CachesDirectoryPath}/edited_${Date.now()}.pdf`;
  await RNFS.writeFile(path, out, 'base64');
  return `file://${path}`;
}
