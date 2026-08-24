import { Platform, type ViewStyle } from 'react-native';

/**
 * Controlled elevation scale. Cross-platform: iOS shadow* + Android elevation.
 * Kept subtle — depth, not drama. Pass the theme shadow color in.
 */
export type ElevationLevel = 0 | 1 | 2 | 3;

export function elevation(level: ElevationLevel, shadowColor: string): ViewStyle {
  if (level === 0) return {};
  const map = {
    1: { radius: 6, offset: 2, opacity: 0.08, android: 2 },
    2: { radius: 14, offset: 6, opacity: 0.1, android: 5 },
    3: { radius: 24, offset: 12, opacity: 0.14, android: 10 },
  }[level];
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor,
      shadowOffset: { width: 0, height: map.offset },
      shadowRadius: map.radius,
      shadowOpacity: map.opacity,
    },
    default: { elevation: map.android, shadowColor },
  })!;
}
