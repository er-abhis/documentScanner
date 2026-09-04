import RNFS from 'react-native-fs';
import { saveToGallery } from '../gallery/save';
import { shareFile } from '../sharing';

/**
 * react-native-qrcode-svg hands back a base64 PNG (via its ref.toDataURL).
 * Both saving and sharing need a real file, so write it to the cache dir once
 * and reuse the existing gallery/share plumbing.
 */
async function writeTempPng(base64: string): Promise<string> {
  const path = `${RNFS.CachesDirectoryPath}/qr_${Date.now()}.png`;
  await RNFS.writeFile(path, base64, 'base64');
  return `file://${path}`;
}

/** Save a generated QR PNG to the device gallery (album "Document Suite"). */
export async function saveQrImage(base64: string): Promise<void> {
  await saveToGallery(await writeTempPng(base64));
}

/** Share a generated QR PNG via the native share sheet. */
export async function shareQrImage(base64: string): Promise<boolean> {
  return shareFile(await writeTempPng(base64), 'image/png', 'QR Code');
}
