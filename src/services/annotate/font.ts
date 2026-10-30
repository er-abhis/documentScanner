import { Platform } from 'react-native';
import { Skia, matchFont, type SkFont } from '@shopify/react-native-skia';

/**
 * A system typeface (Roboto/sans-serif on Android, San Francisco/Helvetica on iOS)
 * at the given pixel size — no bundled font file needed.
 */
export function systemFont(sizePx: number, bold = false): SkFont | null {
  try {
    return matchFont({
      fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }),
      fontSize: sizePx,
      fontWeight: bold ? 'bold' : 'normal',
    });
  } catch {
    try {
      return matchFont({
        fontSize: sizePx,
        fontWeight: bold ? 'bold' : 'normal',
      });
    } catch {
      try {
        const mgr = Skia.FontMgr.System();
        const tf = mgr.matchFamilyStyle('sans-serif', {
          weight: bold ? 700 : 400,
          width: 5,
          slant: 0,
        });
        if (tf) return Skia.Font(tf, sizePx);
      } catch {
        // fallback
      }
      return null;
    }
  }
}

