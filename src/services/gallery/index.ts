import { PermissionsAndroid, Platform } from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';

export type CaptureResult =
  | { status: 'ok'; uri: string }
  | { status: 'cancel' }
  | { status: 'denied' }
  | { status: 'error' };

/**
 * Take a photo with the device camera (image-picker handles the runtime CAMERA
 * permission request). Used by the QR scanner: capture, then decode the still
 * with ML Kit. Distinguishes a denied permission so the UI can show a clear
 * error state.
 */
export async function capturePhoto(): Promise<CaptureResult> {
  try {
    // The manifest declares CAMERA (for image-picker), so Android requires it
    // granted at runtime — otherwise launchCamera throws a SecurityException
    // and never opens the camera. Request it ourselves first.
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return { status: 'denied' };
    }
    // Cap the resolution: full-res phone photos (12MP+) are slow/unreliable for
    // ML Kit and risk OOM. image-picker re-encodes to a clean file:// at this
    // size, which decodes reliably while keeping the QR crisp.
    const res = await launchCamera({
      mediaType: 'photo',
      quality: 0.9,
      saveToPhotos: false,
      maxWidth: 2000,
      maxHeight: 2000,
    });
    if (res.didCancel) return { status: 'cancel' };
    if (res.errorCode) return { status: res.errorCode === 'permission' ? 'denied' : 'error' };
    const uri = res.assets?.[0]?.uri;
    return uri ? { status: 'ok', uri: normalizeUri(uri) } : { status: 'cancel' };
  } catch (e) {
    console.warn('capturePhoto failed:', e);
    return { status: 'error' };
  }
}

/**
 * Pick one or more images from the device gallery. Uses the system photo
 * picker (no runtime permission needed on any Android/iOS version). Returns
 * file:// uris ready for the same edit/PDF pipeline as scanned pages, or an
 * empty array if the user cancels.
 */
export async function pickImages(limit = 0): Promise<string[]> {
  try {
    const res = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: limit, // 0 = unlimited
      quality: 1,
    });

    if (res.didCancel || res.errorCode) return [];

    return (res.assets ?? [])
      .map(a => a.uri)
      .filter((u): u is string => !!u)
      .map(normalizeUri);
  } catch (e) {
    // Picker can reject (activity killed, provider error). Treat as cancel.
    console.warn('pickImages failed:', e);
    return [];
  }
}

/** Android photo-picker uris come back as content:// or bare paths; <Image>/Skia want a scheme. */
function normalizeUri(uri: string): string {
  return uri.startsWith('file://') ||
    uri.startsWith('content://') ||
    uri.startsWith('http')
    ? uri
    : `file://${uri}`;
}
