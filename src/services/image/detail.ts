import { Skia, TileMode, type SkImageFilter } from '@shopify/react-native-skia';

/** Max gaussian sigma at full blur (detail = -1). */
const MAX_SIGMA = 8;

/**
 * One control drives both blur and sharpen: detail in -1..1.
 *   detail < 0  -> gaussian blur (sigma scales with magnitude)
 *   detail > 0  -> unsharp 3x3 convolution (strength scales with magnitude)
 *   detail == 0 -> no filter
 * Same builder feeds the live preview and the baked export, so the two agree.
 */
export function detailImageFilter(detail: number): SkImageFilter | null {
  if (!detail) return null;
  if (detail < 0) {
    const sigma = -detail * MAX_SIGMA;
    return Skia.ImageFilter.MakeBlur(sigma, sigma, TileMode.Clamp, null);
  }
  // 3x3 cross-shaped sharpen; center = 1 + 4a, edges = -a. Sum stays 1 so
  // overall brightness is preserved.
  const a = detail;
  const kernel = [0, -a, 0, -a, 1 + 4 * a, -a, 0, -a, 0];
  return Skia.ImageFilter.MakeMatrixConvolution(
    3, 3, kernel, 1, 0, 1, 1, TileMode.Clamp, false, null,
  );
}

/** Preview sigma for the declarative <Blur> element (0 when not blurring). */
export function previewBlurSigma(detail: number): number {
  return detail < 0 ? -detail * MAX_SIGMA : 0;
}
