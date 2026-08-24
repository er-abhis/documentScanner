import { Skia, type SkFont } from '@shopify/react-native-skia';

/**
 * A system typeface (Roboto on Android, San Francisco on iOS) at the given
 * pixel size — no bundled font file needed. Returns null if the platform font
 * manager can't provide one, so callers guard text rendering.
 */
export function systemFont(sizePx: number, bold = false): SkFont | null {
  try {
    const mgr = Skia.FontMgr.System();
    const typeface = mgr.matchFamilyStyle('', {
      weight: bold ? 700 : 400,
      width: 5, // normal
      slant: 0, // upright
    });
    if (!typeface) return null;
    return Skia.Font(typeface, sizePx);
  } catch {
    return null;
  }
}
