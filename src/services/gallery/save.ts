import { PermissionsAndroid, Platform } from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

/** On Android ≤10 saving needs WRITE_EXTERNAL_STORAGE; 11+ uses scoped storage. */
async function ensurePermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || Number(Platform.Version) >= 30) return true;
  const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
  return res === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Save an image file to the device Photos gallery (MediaStore on Android 11+,
 * no permission needed; a runtime request is made on older versions).
 */
export async function saveToGallery(uri: string): Promise<string> {
  const ok = await ensurePermission();
  if (!ok) throw new Error('permission_denied');
  return CameraRoll.save(uri, { type: 'photo', album: 'Document Suite' });
}
