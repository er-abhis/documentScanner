import { CameraRoll } from '@react-native-camera-roll/camera-roll';

/**
 * Save an image file to the device Photos gallery (MediaStore on Android 10+,
 * no permission needed for saving). Returns the saved asset uri.
 */
export async function saveToGallery(uri: string): Promise<string> {
  return CameraRoll.save(uri, { type: 'photo', album: 'Document Suite' });
}
