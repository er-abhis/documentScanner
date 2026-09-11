import RNFS from 'react-native-fs';

/** One decoded EXIF field, ready to list in the UI. */
export type ExifEntry = { label: string; value: string };

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Minimal base64 -> bytes (no Buffer/atob dependency). */
function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = Math.floor((clean.length * 3) / 4);
  const out = new Uint8Array(len);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = B64.indexOf(clean[i]);
    const c1 = B64.indexOf(clean[i + 1]);
    const c2 = B64.indexOf(clean[i + 2]);
    const c3 = B64.indexOf(clean[i + 3]);
    const n = (c0 << 18) | (c1 << 12) | ((c2 & 63) << 6) | (c3 & 63);
    if (p < len) out[p++] = (n >> 16) & 0xff;
    if (c2 !== -1 && p < len) out[p++] = (n >> 8) & 0xff;
    if (c3 !== -1 && p < len) out[p++] = n & 0xff;
  }
  return out;
}

const strip = (u: string) => u.replace(/^file:\/\//, '');

// Tags we surface (IFD0 + Exif SubIFD). value = human label.
const TAGS: Record<number, string> = {
  0x010f: 'Make',
  0x0110: 'Model',
  0x0112: 'Orientation',
  0x0132: 'Date/Time',
  0x829a: 'Exposure',
  0x8827: 'ISO',
  0x920a: 'Focal length',
  0x9003: 'Taken',
  0xa002: 'Width',
  0xa003: 'Height',
};
const ORIENT: Record<number, string> = {
  1: 'Normal', 3: 'Rotated 180°', 6: 'Rotated 90° CW', 8: 'Rotated 90° CCW',
};

/**
 * Parse the EXIF block from a JPEG. Only the file head is read (EXIF lives in the
 * first APP1 marker), so this stays cheap even for large photos. Returns [] when
 * there is no EXIF (e.g. PNG, or already-stripped images).
 */
export async function readExif(uri: string): Promise<ExifEntry[]> {
  let head: string;
  try {
    head = await RNFS.read(strip(uri), 262144, 0, 'base64');
  } catch {
    return [];
  }
  const b = b64ToBytes(head);
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return []; // not JPEG

  // find APP1 (FFE1) with "Exif\0\0"
  let i = 2;
  let tiff = -1;
  while (i + 4 < b.length) {
    if (b[i] !== 0xff) break;
    const marker = b[i + 1];
    const size = (b[i + 2] << 8) | b[i + 3];
    if (marker === 0xe1 && b[i + 4] === 0x45 && b[i + 5] === 0x78) {
      tiff = i + 10; // skip "Exif\0\0"
      break;
    }
    if (marker === 0xda) break; // start of scan — no more metadata
    i += 2 + size;
  }
  if (tiff < 0 || tiff + 8 > b.length) return [];

  const le = b[tiff] === 0x49; // 'II' little-endian, 'MM' big-endian
  const u16 = (o: number) => (le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1]);
  const u32 = (o: number) =>
    le
      ? (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0
      : ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;

  const entries: ExifEntry[] = [];
  const seen = new Set<string>();

  const readVal = (type: number, count: number, valOff: number): string => {
    if (type === 2) {
      // ASCII
      let s = '';
      for (let k = 0; k < count && valOff + k < b.length; k++) {
        const c = b[valOff + k];
        if (c === 0) break;
        s += String.fromCharCode(c);
      }
      return s.trim();
    }
    if (type === 3) return String(u16(valOff)); // SHORT
    if (type === 4) return String(u32(valOff)); // LONG
    if (type === 5) {
      // RATIONAL
      const n = u32(valOff);
      const d = u32(valOff + 4) || 1;
      return d === 1 ? String(n) : `${(n / d).toFixed(2)}`;
    }
    return '';
  };

  const parseIFD = (ifdOff: number, gps = false) => {
    if (ifdOff <= 0 || tiff + ifdOff + 2 > b.length) return;
    const base = tiff + ifdOff;
    const n = u16(base);
    let subExif = 0;
    for (let e = 0; e < n; e++) {
      const off = base + 2 + e * 12;
      if (off + 12 > b.length) break;
      const tag = u16(off);
      const type = u16(off + 2);
      const count = u32(off + 4);
      const sizePer = type === 1 || type === 2 ? 1 : type === 3 ? 2 : type === 5 ? 8 : 4;
      const total = sizePer * count;
      const valOff = total <= 4 ? off + 8 : tiff + u32(off + 8);
      if (tag === 0x8769) subExif = u32(off + 8);
      if (gps) continue; // GPS handled separately below
      const label = TAGS[tag];
      if (!label || seen.has(label)) continue;
      const v = readVal(type, count, valOff);
      if (!v) continue;
      seen.add(label);
      entries.push({
        label,
        value: label === 'Orientation' ? ORIENT[Number(v)] ?? v
          : label === 'ISO' ? `ISO ${v}`
          : label === 'Focal length' ? `${v} mm`
          : label === 'Exposure' ? `${v} s`
          : v,
      });
    }
    if (subExif) parseIFD(subExif);
  };

  parseIFD(u32(tiff + 4));
  return entries;
}

/**
 * Strip all metadata by transcoding through Skia (decode -> re-encode drops
 * EXIF/GPS). Returns a new file uri; the original is untouched.
 */
export async function stripExif(uri: string): Promise<string> {
  const { processToImage } = await import('./resize');
  const out = await processToImage(uri, { format: 'jpg', quality: 95 });
  return out.uri;
}
