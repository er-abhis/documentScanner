/**
 * Skia color matrices (row-major 4x5, operating on normalized RGBA + offset).
 * Filters are cheap GPU color transforms — same matrix drives the live preview
 * and the full-resolution export, so what you see is what you save.
 */
export type ColorMatrix = number[]; // length 20

export const IDENTITY: ColorMatrix = [
  1, 0, 0, 0, 0,
  0, 1, 0, 0, 0,
  0, 0, 1, 0, 0,
  0, 0, 0, 1, 0,
];

/** Compose g after f (g ∘ f) for two 4x5 matrices. */
export function compose(g: ColorMatrix, f: ColorMatrix): ColorMatrix {
  const G = to5x5(g);
  const F = to5x5(f);
  const R = Array(25).fill(0);
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 5; c++)
      for (let k = 0; k < 5; k++) R[r * 5 + c] += G[r * 5 + k] * F[k * 5 + c];
  // take first 4 rows
  const out: number[] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) out.push(R[r * 5 + c]);
  return out;
}

function to5x5(m: ColorMatrix): number[] {
  return [...m, 0, 0, 0, 0, 1];
}

export function brightness(offset: number): ColorMatrix {
  return [
    1, 0, 0, 0, offset,
    0, 1, 0, 0, offset,
    0, 0, 1, 0, offset,
    0, 0, 0, 1, 0,
  ];
}

export function contrast(c: number): ColorMatrix {
  const t = 0.5 * (1 - c);
  return [
    c, 0, 0, 0, t,
    0, c, 0, 0, t,
    0, 0, c, 0, t,
    0, 0, 0, 1, 0,
  ];
}

const LR = 0.299, LG = 0.587, LB = 0.114;

export function saturation(s: number): ColorMatrix {
  const sr = (1 - s) * LR;
  const sg = (1 - s) * LG;
  const sb = (1 - s) * LB;
  return [
    sr + s, sg, sb, 0, 0,
    sr, sg + s, sb, 0, 0,
    sr, sg, sb + s, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

export const grayscale = (): ColorMatrix => saturation(0);

/** Colour temperature: warmth>0 warms (more red, less blue); <0 cools. */
export function temperature(warmth: number): ColorMatrix {
  return [
    1 + warmth, 0, 0, 0, 0,
    0, 1, 0, 0, 0,
    0, 0, 1 - warmth, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

export function sepia(): ColorMatrix {
  return [
    0.393, 0.769, 0.189, 0, 0,
    0.349, 0.686, 0.168, 0, 0,
    0.272, 0.534, 0.131, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

export type FilterKey =
  | 'original'
  | 'magic'
  | 'document'
  | 'color'
  | 'enhanced'
  | 'grayscale'
  | 'bw'
  | 'receipt'
  | 'warm'
  | 'cool'
  | 'vivid'
  | 'sepia';

export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'original', label: 'Original' },
  { key: 'magic', label: 'Magic' },
  { key: 'document', label: 'Document' },
  { key: 'color', label: 'Color' },
  { key: 'enhanced', label: 'Enhanced' },
  { key: 'grayscale', label: 'Grayscale' },
  { key: 'bw', label: 'B & W' },
  { key: 'receipt', label: 'Receipt' },
  { key: 'warm', label: 'Warm' },
  { key: 'cool', label: 'Cool' },
  { key: 'vivid', label: 'Vivid' },
  { key: 'sepia', label: 'Sepia' },
];

function base(key: FilterKey): ColorMatrix {
  switch (key) {
    case 'magic':
      return compose(saturation(1.15), compose(contrast(1.28), brightness(0.05)));
    case 'document':
      return compose(contrast(1.35), compose(saturation(0.5), brightness(0.06)));
    case 'color':
      return compose(saturation(1.1), compose(contrast(1.12), brightness(0.04)));
    case 'enhanced':
      return compose(saturation(1.25), compose(contrast(1.18), brightness(0.03)));
    case 'grayscale':
      return grayscale();
    case 'bw':
      return compose(contrast(2.1), compose(grayscale(), brightness(0.02)));
    case 'receipt':
      return compose(contrast(1.9), compose(saturation(0.15), brightness(0.12)));
    case 'warm':
      return compose(saturation(1.1), compose(temperature(0.12), brightness(0.02)));
    case 'cool':
      return compose(saturation(1.05), temperature(-0.12));
    case 'vivid':
      return compose(saturation(1.5), compose(contrast(1.22), brightness(0.02)));
    case 'sepia':
      return compose(contrast(1.1), sepia());
    case 'original':
    default:
      return IDENTITY;
  }
}

/**
 * Final matrix = user brightness/contrast on top of the chosen filter.
 * @param b normalized -1..1  @param c normalized -1..1
 */
export function buildMatrix(key: FilterKey, b: number, c: number): ColorMatrix {
  const bOffset = b * 0.4;
  const cFactor = Math.max(0.2, 1 + c); // -1..1 -> 0..2
  return compose(contrast(cFactor), compose(brightness(bOffset), base(key)));
}
