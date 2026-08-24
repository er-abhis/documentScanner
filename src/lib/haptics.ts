import { Vibration, Platform } from 'react-native';

/**
 * Lightweight tactile feedback using the built-in Vibration API (no extra
 * native dependency). Subtle by design — used on primary actions, selection
 * and success. Guarded so a missing VIBRATE permission can never crash the app.
 */
const buzz = (pattern: number | number[]) => {
  try {
    Vibration.vibrate(pattern);
  } catch {
    // no-op if VIBRATE permission is unavailable
  }
};

export const haptics = {
  light: () => buzz(Platform.OS === 'android' ? 8 : 1),
  medium: () => buzz(18),
  success: () => buzz([0, 12, 40, 18]),
  warning: () => buzz([0, 20, 60, 20]),
};
