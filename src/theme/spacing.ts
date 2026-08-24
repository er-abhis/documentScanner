/** 4-point spacing scale. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Consistent icon sizing. */
export const iconSize = {
  sm: 18,
  md: 22,
  lg: 26,
  xl: 32,
} as const;

/** Minimum accessible touch target (Android/iOS guideline). */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
export const MIN_TOUCH = 44;
