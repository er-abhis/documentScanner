import { Skia, ImageFormat, FilterMode, MipmapMode } from '@shopify/react-native-skia';
import RNFS from 'react-native-fs';

/** Common ID photo sizes (millimetres). */
export type IdSpec = { key: string; label: string; wMm: number; hMm: number };

export const ID_SPECS: IdSpec[] = [
  { key: 'passport', label: 'Passport 35×45', wMm: 35, hMm: 45 },
  { key: 'visa2in', label: 'Visa 2×2 in', wMm: 51, hMm: 51 },
  { key: 'size25x35', label: '25×35 mm', wMm: 25, hMm: 35 },
  { key: 'stamp', label: 'Stamp 20×25', wMm: 20, hMm: 25 },
];

const DPI = 300;
const mm = (v: number) => Math.round((v / 25.4) * DPI);

// Standard 4R photo print: 102 × 152 mm.
const SHEET_W_MM = 102;
const SHEET_H_MM = 152;
const MARGIN_MM = 5;
const GAP_MM = 4;

export const specPx = (spec: IdSpec) => ({ w: mm(spec.wMm), h: mm(spec.hMm) });

/** Columns × rows of a spec that tile onto one 4R print sheet (used by the UI to
 * show how many copies a sheet yields, and by the sheet renderer itself). */
export function sheetGrid(spec: IdSpec): { cols: number; rows: number; count: number } {
  const { w: pw, h: ph } = specPx(spec);
  const sw = mm(SHEET_W_MM), sh = mm(SHEET_H_MM);
  const margin = mm(MARGIN_MM), gap = mm(GAP_MM);
  const cols = Math.max(1, Math.floor((sw - 2 * margin + gap) / (pw + gap)));
  const rows = Math.max(1, Math.floor((sh - 2 * margin + gap) / (ph + gap)));
  return { cols, rows, count: cols * rows };
}

export type Crop = { x: number; y: number; w: number; h: number };

/**
 * Crop rect (in source pixels) for the chosen spec aspect, adjusted by zoom
 * (1 = fit, >1 zoom in) and pan offsets (-1..1, 0 = centred). Shared by the live
 * preview and the export so what you frame is what you get.
 */
export function computeCrop(iw: number, ih: number, ar: number, zoom: number, offX: number, offY: number): Crop {
  const srcAr = iw / ih;
  let bw: number, bh: number;
  if (srcAr > ar) { bh = ih; bw = ih * ar; } else { bw = iw; bh = iw / ar; }
  const z = Math.max(1, zoom);
  const cw = bw / z;
  const ch = bh / z;
  const maxDx = (iw - cw) / 2;
  const maxDy = (ih - ch) / 2;
  const cx = iw / 2 + offX * maxDx;
  const cy = ih / 2 + offY * maxDy;
  const x = Math.max(0, Math.min(iw - cw, cx - cw / 2));
  const y = Math.max(0, Math.min(ih - ch, cy - ch / 2));
  return { x, y, w: cw, h: ch };
}

export type IdPhotoOptions = {
  uri: string;
  spec: IdSpec;
  zoom?: number;
  offX?: number;
  offY?: number;
  /** fill colour behind the subject — matters when the source has transparency
   * (e.g. a background-removed cutout) */
  background?: string;
  quality?: number;
};

/** Produce a single ID photo at exact spec size (300 DPI). Returns a file uri. */
export async function buildIdPhoto({ uri, spec, zoom = 1, offX = 0, offY = 0, background, quality = 95 }: IdPhotoOptions): Promise<string> {
  const src = Skia.Image.MakeImageFromEncoded(await Skia.Data.fromURI(uri));
  if (!src) throw new Error('decode_failed');
  const { w: pw, h: ph } = specPx(spec);
  const crop = computeCrop(src.width(), src.height(), pw / ph, zoom, offX, offY);

  const surface = Skia.Surface.MakeOffscreen(pw, ph);
  if (!surface) throw new Error('surface_failed');
  if (background) surface.getCanvas().clear(Skia.Color(background));
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  surface.getCanvas().drawImageRect(
    src,
    Skia.XYWHRect(crop.x, crop.y, crop.w, crop.h),
    Skia.XYWHRect(0, 0, pw, ph),
    paint,
  );
  surface.flush();

  const base64 = surface.makeImageSnapshot().encodeToBase64(ImageFormat.JPEG, quality);
  const path = `${RNFS.CachesDirectoryPath}/idphoto_${Date.now()}.jpg`;
  await RNFS.writeFile(path, base64, 'base64');
  return `file://${path}`;
}

export type IdSheetOptions = {
  /** an already-cropped single ID photo (from buildIdPhoto) */
  photoUri: string;
  spec: IdSpec;
  background?: string;
  cutLines?: boolean;
  quality?: number;
};

/**
 * Tile copies of a single ID photo onto a print-ready 4R sheet. Returns a file
 * uri. Use when the user wants a sheet to print & cut, not a single photo.
 */
export async function buildIdSheet({ photoUri, spec, background = '#FFFFFF', cutLines = true, quality = 95 }: IdSheetOptions): Promise<string> {
  const photo = Skia.Image.MakeImageFromEncoded(await Skia.Data.fromURI(photoUri));
  if (!photo) throw new Error('decode_failed');
  const { w: pw, h: ph } = specPx(spec);

  const sw = mm(SHEET_W_MM);
  const sh = mm(SHEET_H_MM);
  const gap = mm(GAP_MM);
  const { cols, rows } = sheetGrid(spec);

  const sheet = Skia.Surface.MakeOffscreen(sw, sh);
  if (!sheet) throw new Error('surface_failed');
  const canvas = sheet.getCanvas();
  canvas.clear(Skia.Color(background));

  const imgPaint = Skia.Paint();
  imgPaint.setAntiAlias(true);
  const line = Skia.Paint();
  line.setStyle(1);
  line.setStrokeWidth(1);
  line.setColor(Skia.Color('#CCCCCC'));

  const blockW = cols * pw + (cols - 1) * gap;
  const blockH = rows * ph + (rows - 1) * gap;
  const startX = (sw - blockW) / 2;
  const startY = (sh - blockH) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * (pw + gap);
      const y = startY + r * (ph + gap);
      const rect = Skia.XYWHRect(x, y, pw, ph);
      canvas.drawImageRectOptions(photo, Skia.XYWHRect(0, 0, photo.width(), photo.height()), rect, FilterMode.Linear, MipmapMode.None, imgPaint);
      if (cutLines) canvas.drawRect(rect, line);
    }
  }
  sheet.flush();

  const base64 = sheet.makeImageSnapshot().encodeToBase64(ImageFormat.JPEG, quality);
  const path = `${RNFS.CachesDirectoryPath}/idsheet_${Date.now()}.jpg`;
  await RNFS.writeFile(path, base64, 'base64');
  return `file://${path}`;
}
