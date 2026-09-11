import { NativeModules } from 'react-native';

const { BackgroundRemover } = NativeModules as {
  BackgroundRemover?: { removeBackground(uri: string): Promise<string> };
};

/** True once the native ML Kit module is built into the app. */
export const bgRemovalAvailable = !!BackgroundRemover;

/**
 * Remove the background on-device (ML Kit Subject Segmentation). Returns a
 * transparent PNG of the foreground subject. Throws if the native module isn't
 * present (needs a rebuild) or no subject is found.
 */
export async function removeBackground(uri: string): Promise<string> {
  if (!BackgroundRemover) throw new Error('bg_remove_unavailable');
  return BackgroundRemover.removeBackground(uri);
}
