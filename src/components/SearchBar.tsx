import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, TextInput } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { HIT_SLOP, useTheme } from '../theme';

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
};

/** Reusable search field: icon, instant text, clear button, focus highlight. */
export function SearchBar({ value, onChangeText, placeholder = 'Search' }: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const glow = useRef(new Animated.Value(0)).current;

  const animate = (to: number) => {
    setFocused(to === 1);
    Animated.timing(glow, {
      toValue: to,
      duration: theme.motion.duration.fast,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.border, theme.colors.brand],
  });

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.md,
          borderColor,
          borderWidth: 1.5,
        },
      ]}
    >
      <Search
        size={theme.iconSize.sm}
        color={focused ? theme.colors.brand : theme.colors.textTertiary}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textTertiary}
        onFocus={() => animate(1)}
        onBlur={() => animate(0)}
        style={[styles.input, theme.typography.body, { color: theme.colors.text }]}
        returnKeyType="search"
        clearButtonMode="never"
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <X size={theme.iconSize.sm} color={theme.colors.textTertiary} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 46,
  },
  input: { flex: 1, paddingVertical: 0 },
});
