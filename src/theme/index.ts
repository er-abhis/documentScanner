import { useColorScheme } from 'react-native';
import { darkColors, lightColors, type ColorRoles } from './colors';
import { elevation, type ElevationLevel } from './shadows';
import { spacing, radius, iconSize, HIT_SLOP, MIN_TOUCH } from './spacing';
import { typography, type TypeVariant } from './typography';
import { motion } from './motion';

export type Theme = {
  mode: 'light' | 'dark';
  colors: ColorRoles;
  spacing: typeof spacing;
  radius: typeof radius;
  iconSize: typeof iconSize;
  typography: typeof typography;
  motion: typeof motion;
  elevation: (level: ElevationLevel) => ReturnType<typeof elevation>;
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const mode = scheme === 'dark' ? 'dark' : 'light';
  const colors = mode === 'dark' ? darkColors : lightColors;
  return {
    mode,
    colors,
    spacing,
    radius,
    iconSize,
    typography,
    motion,
    elevation: level => elevation(level, colors.shadow),
  };
}

export { spacing, radius, iconSize, typography, motion, HIT_SLOP, MIN_TOUCH };
export type { ColorRoles, TypeVariant, ElevationLevel };
