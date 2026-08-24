import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme, type ElevationLevel } from '../theme';

type Props = {
  children: ReactNode;
  elevation?: ElevationLevel;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Card({
  children,
  elevation = 1,
  padded = true,
  style,
}: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          // subtle outline in dark mode where shadows read weakly
          borderWidth: theme.mode === 'dark' ? StyleSheet.hairlineWidth : 0,
          borderColor: theme.colors.border,
          padding: padded ? theme.spacing.lg : 0,
        },
        theme.elevation(elevation),
        style,
      ]}
    >
      {children}
    </View>
  );
}
