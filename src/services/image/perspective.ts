import { Skia, ImageFormat, FilterMode, MipmapMode } from '@shopify/react-native-skia';
import RNFS from 'react-native-fs';

export type Point = { x: number; y: number };

/** Corner order used everywhere: top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Point, Point, Point, Point];

function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Output size that best preserves the selected quad's real dimensions. */
export function outputSize(q: Quad): { width: number; height: number } {
  const w = (dist(q[0], q[1]) + dist(q[3], q[2])) / 2;
  const h = (dist(q[0], q[3]) + dist(q[1], q[2])) / 2;
  return { width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) };
}

/**
 * 3x3 homography mapping src quad -> dst quad, returned row-major for SkMatrix
 * [scaleX, skewX, transX, skewY, scaleY, transY, persp0, persp1, persp2].
 * Solves the 8-unknown linear system via Gaussian elimination.
 */
export function homography(src: Quad, dst: Quad): number[] {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = solve(A, b); // h0..h7
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

/** Gaussian elimination with partial pivoting for an 8x8 system. */
function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    }
    [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col] || 1e-10;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / d;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  // M is now diagonal: solution = augmented column / diagonal
  return M.map((row, i) => row[n] / (M[i][i] || 1e-10));
}

/** Rotate a decoded image by 0/90/180/270°, returning a new SkImage. */
function rotate(img: ReturnType<typeof decodeSync>, deg: number) {
  const d = ((deg % 360) + 360) % 360;
  if (d === 0 || !img) return img;
  const w = img.width();
  const h = img.height();
  const swap = d === 90 || d === 270;
  const surface = Skia.Surface.MakeOffscreen(swap ? h : w, swap ? w : h);
  if (!surface) return img;
  const canvas = surface.getCanvas();
  if (d === 90) canvas.translate(h, 0);
  else if (d === 180) canvas.translate(w, h);
  else canvas.translate(0, w); // 270
  canvas.rotate(d, 0, 0);
  canvas.drawImage(img, 0, 0);
  surface.flush();
  return surface.makeImageSnapshot();
}

function decodeSync(data: Parameters<typeof Skia.Image.MakeImageFromEncoded>[0]) {
  return Skia.Image.MakeImageFromEncoded(data);
}

export type WarpArgs = {
  /** file:// uri of the source page */
  uri: string;
  /** corners in the *rotated* image's pixel space (TL,TR,BR,BL) */
  corners: Quad;
  /** 0/90/180/270 applied before warping */
  rotation?: number;
  /** JPEG quality 1-100 */
  quality?: number;
  /** optional 4x5 color matrix (enhancement filter) baked into the same pass */
  colorMatrix?: number[];
};

/**
 * Applies rotation + perspective crop to the real pixels and writes a new JPEG
 * to the cache dir. Returns the new file:// uri. The output is the corrected
 * document, not a visual overlay.
 */
export async function warpDocument({
  uri,
  corners,
  rotation = 0,
  quality = 92,
  colorMatrix,
}: WarpArgs): Promise<string> {
  const data = await Skia.Data.fromURI(uri);
  const decoded = decodeSync(data);
  if (!decoded) throw new Error('decode_failed');
  const img = rotate(decoded, rotation);
  if (!img) throw new Error('rotate_failed');

  const { width, height } = outputSize(corners);
  const dst: Quad = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];
  const m = homography(corners, dst);

  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) throw new Error('surface_failed');
  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  if (colorMatrix) paint.setColorFilter(Skia.ColorFilter.MakeMatrix(colorMatrix));
  canvas.concat(m);
  canvas.drawImageOptions(img, 0, 0, FilterMode.Linear, MipmapMode.None, paint);
  surface.flush();

  const snapshot = surface.makeImageSnapshot();
  const base64 = snapshot.encodeToBase64(ImageFormat.JPEG, quality);
  const path = `${RNFS.CachesDirectoryPath}/edited_${Date.now()}.jpg`;
  await RNFS.writeFile(path, base64, 'base64');
  return `file://${path}`;
}
