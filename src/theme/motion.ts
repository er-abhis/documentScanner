import { Easing } from 'react-native';

/** Shared timing so transitions/micro-interactions feel consistent. */
export const motion = {
  duration: { fast: 120, base: 200, slow: 320 },
  easing: {
    standard: Easing.bezier(0.2, 0, 0, 1),
    decelerate: Easing.out(Easing.cubic),
    accelerate: Easing.in(Easing.cubic),
  },
  // press micro-interaction scale
  pressScale: 0.97,
} as const;
