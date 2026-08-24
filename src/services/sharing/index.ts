import { Linking } from 'react-native';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import {
  DOC_SHARE_FOOTER,
  PLAY_STORE_MARKET,
  PLAY_STORE_WEB,
  SHARE_APP_MESSAGE,
} from '../../config/app';

const strip = (uri: string) => uri.replace(/^file:\/\//, '');

/**
 * react-native-share's FileProvider only exposes the cache dir, so copy the
 * file there first (works for files in internal storage / documents dir).
 */
async function toShareable(uri: string): Promise<string> {
  const src = strip(uri);
  const name = src.split('/').pop() || `share_${Date.now()}`;
  const dest = `${RNFS.CachesDirectoryPath}/${name}`;
  if (src !== dest) {
    if (await RNFS.exists(dest)) await RNFS.unlink(dest);
    await RNFS.copyFile(src, dest);
  }
  return `file://${dest}`;
}

const isCancel = (e: unknown) =>
  /cancel|dismiss|did not share/i.test((e as { message?: string })?.message ?? '');

/**
 * Open the native share sheet for a local file. Returns true if shared, false
 * if the user dismissed. Throws only on real failures.
 */
export async function shareFile(
  uri: string,
  mimeType: string,
  title?: string,
  message?: string,
): Promise<boolean> {
  try {
    const url = await toShareable(uri);
    await Share.open({ url, type: mimeType, title, message, failOnCancel: false });
    return true;
  } catch (e: unknown) {
    if (isCancel(e)) return false;
    throw e;
  }
}

/** Share plain text (e.g. OCR output) via the native sheet. */
export async function shareText(text: string): Promise<boolean> {
  try {
    await Share.open({ message: text, failOnCancel: false });
    return true;
  } catch (e: unknown) {
    if (isCancel(e)) return false;
    throw e;
  }
}

/** Share several local files at once (e.g. batch-converted images). */
export async function shareFiles(uris: string[], mimeType: string): Promise<boolean> {
  try {
    const urls = await Promise.all(uris.map(u => toShareable(u)));
    await Share.open({ urls, type: mimeType, failOnCancel: false });
    return true;
  } catch (e: unknown) {
    if (isCancel(e)) return false;
    throw e;
  }
}

export const sharePdf = (uri: string, name?: string) =>
  shareFile(uri, 'application/pdf', name, DOC_SHARE_FOOTER.trimStart());

export const shareImage = (uri: string) =>
  shareFile(uri, 'image/jpeg', undefined, DOC_SHARE_FOOTER.trimStart());

/** Share the app itself (text-only Play Store link). */
export async function shareApp(): Promise<boolean> {
  try {
    await Share.open({
      message: SHARE_APP_MESSAGE,
      title: 'Share app',
      failOnCancel: false,
    });
    return true;
  } catch (e: unknown) {
    if (isCancel(e)) return false;
    throw e;
  }
}

/** Open the Play Store listing so the user can rate. */
export async function rateApp(): Promise<void> {
  try {
    await Linking.openURL(PLAY_STORE_MARKET); // opens Play Store app directly
  } catch {
    await Linking.openURL(PLAY_STORE_WEB); // fallback: browser
  }
}
