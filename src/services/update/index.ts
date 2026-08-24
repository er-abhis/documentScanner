import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

const { PlayUpdate } = NativeModules as {
  PlayUpdate?: {
    checkForUpdate(): Promise<boolean>;
    startFlexibleUpdate(): Promise<boolean>;
    completeUpdate(): void;
  };
};

const emitter = PlayUpdate ? new NativeEventEmitter(NativeModules.PlayUpdate) : null;

/**
 * Google Play In-App Updates via a native AppUpdateManager module. Play only
 * reports updates when the app is installed from Play (internal/closed/prod);
 * in dev/sideload these all no-op. True silent install isn't allowed by Play —
 * a flexible update downloads in the background, then the user confirms restart.
 */
export async function checkForUpdate(): Promise<boolean> {
  if (Platform.OS !== 'android' || !PlayUpdate) return false;
  try {
    return await PlayUpdate.checkForUpdate();
  } catch {
    return false;
  }
}

/**
 * Start a flexible update (background download). `onDownloaded` fires when the
 * update is ready; call installUpdate() then to apply it.
 */
export async function startFlexibleUpdate(onDownloaded: () => void): Promise<void> {
  if (!PlayUpdate || !emitter) return;
  const sub = emitter.addListener('PlayUpdate_downloaded', () => {
    sub.remove();
    onDownloaded();
  });
  try {
    await PlayUpdate.startFlexibleUpdate();
  } catch {
    sub.remove();
  }
}

/** Apply a downloaded flexible update (restarts to install). */
export function installFlexibleUpdate(): void {
  PlayUpdate?.completeUpdate();
}
