import { Pressable, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { HIT_SLOP, MIN_TOUCH, useTheme } from '../theme';

type Props = {
  icon: LucideIcon;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: 'plain' | 'surface';
  color?: string;
  disabled?: boolean;
  /** icon glyph size (default: theme medium) */
  size?: number;
};

export function IconButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  variant = 'plain',
  color,
  disabled = false,
  size,
}: Props) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      android_ripple={{ color: theme.colors.border, borderless: variant === 'plain' }}
      style={({ pressed }) => [
        styles.base,
        variant === 'surface' && {
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.radius.pill,
        },
        pressed && { opacity: 0.6 },
        disabled && { opacity: 0.3 },
      ]}
    >
      <Icon size={size ?? theme.iconSize.md} color={color ?? theme.colors.text} />
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
