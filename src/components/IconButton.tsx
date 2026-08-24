import { Pressable, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { HIT_SLOP, MIN_TOUCH, useTheme } from '../theme';

type Props = {
  icon: LucideIcon;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: 'plain' | 'surface';
  color?: string;
};

export function IconButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  variant = 'plain',
  color,
}: Props) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: theme.colors.border, borderless: variant === 'plain' }}
      style={({ pressed }) => [
        styles.base,
        variant === 'surface' && {
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.radius.pill,
        },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Icon size={theme.iconSize.md} color={color ?? theme.colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
