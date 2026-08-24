import { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import { Text } from './Text';
import { MIN_TOUCH, useTheme } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon: Icon,
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  accessibilityHint,
}: Props) {
  const theme = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  const animate = (to: number) =>
    Animated.timing(scale, {
      toValue: to,
      duration: theme.motion.duration.fast,
      useNativeDriver: true,
    }).start();

  const height = size === 'lg' ? 54 : 46;
  const fg =
    variant === 'primary'
      ? theme.colors.onBrand
      : variant === 'danger'
        ? theme.colors.danger
        : variant === 'ghost'
          ? theme.colors.brand
          : theme.colors.text;

  const inner = (
    <>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {Icon ? <Icon size={theme.iconSize.sm} color={fg} /> : null}
          <Text variant="bodyStrong" style={{ color: fg }}>
            {title}
          </Text>
        </View>
      )}
    </>
  );

  const base: ViewStyle = {
    height,
    borderRadius: theme.radius.md,
    opacity: isDisabled ? 0.5 : 1,
    minHeight: MIN_TOUCH,
  };

  return (
    <Animated.View
      style={[{ transform: [{ scale }] }, fullWidth && styles.full, style]}
    >
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        onPressIn={() => animate(theme.motion.pressScale)}
        onPressOut={() => animate(1)}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        accessibilityHint={accessibilityHint}
        android_ripple={
          variant === 'primary'
            ? { color: '#FFFFFF33' }
            : { color: theme.colors.border }
        }
        style={styles.pressable}
      >
        {variant === 'primary' ? (
          <LinearGradient
            colors={theme.colors.brandGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[base, styles.center]}
          >
            {inner}
          </LinearGradient>
        ) : (
          <View
            style={[
              base,
              styles.center,
              {
                backgroundColor:
                  variant === 'ghost' ? 'transparent' : theme.colors.surface,
                borderWidth: variant === 'ghost' ? 0 : StyleSheet.hairlineWidth,
                borderColor:
                  variant === 'danger' ? theme.colors.danger : theme.colors.borderStrong,
              },
            ]}
          >
            {inner}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch' },
  pressable: { borderRadius: 14, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
