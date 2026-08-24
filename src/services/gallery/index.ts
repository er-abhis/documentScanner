import { launchImageLibrary } from 'react-native-image-picker';

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
