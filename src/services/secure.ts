import RNFS from 'react-native-fs';

/**
 * Private / secure helpers.
 *
 * Biometric gating uses react-native-biometrics. The require is guarded so the
 * app still builds and runs before that native dep is installed — until then
 * biometricAvailable() is false and biometricAuth() no-ops to `true` (the gate
 * is best-effort, never a hard lock-out that traps the user).
 *
 * Install to activate: `npm i react-native-biometrics` then rebuild.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Biometrics: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-native-biometrics');
  Biometrics = mod?.default ?? mod?.ReactNativeBiometrics ?? mod;
} catch {
  Biometrics = null;
}

function instance() {
  if (!Biometrics) return null;
  try {
    return new Biometrics({ allowDeviceCredentials: true });
  } catch {
    return null;
  }
}

export async function biometricAvailable(): Promise<boolean> {
  const rnb = instance();
  if (!rnb) return false;
  try {
    const { available } = await rnb.isSensorAvailable();
    return !!available;
  } catch {
    return false;
  }
}

/** Prompt for fingerprint/face. Returns true on success (or if no sensor/dep). */
export async function biometricAuth(reason: string): Promise<boolean> {
  const rnb = instance();
  if (!rnb) return true; // dep not installed yet — don't block the user
  try {
    const { success } = await rnb.simplePrompt({ promptMessage: reason });
    return !!success;
  } catch {
    return false;
  }
}

// Temp files the image pipeline writes to the (app-private) cache dir.
const TEMP_RX = /^(edited|rot|converted|annotated|joined|idsheet|idphoto|cleaned|cutout|img|convert|temp_conv|scan|pdfpage)_/;

/**
 * Wipe leftover editing temp files from the cache dir. These already live in the
 * app's private sandbox, but a private session should leave nothing behind.
 * Returns the number of files removed.
 */
export async function wipeImageCache(): Promise<number> {
  let removed = 0;
  try {
    const files = await RNFS.readDir(RNFS.CachesDirectoryPath);
    for (const f of files) {
      if (f.isFile() && TEMP_RX.test(f.name)) {
        try {
          await RNFS.unlink(f.path);
          removed++;
        } catch {
          /* ignore individual failures */
        }
      }
    }
  } catch {
    /* cache dir unreadable — nothing to do */
  }
  return removed;
}
