import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme, type TypeVariant } from '../theme';
import type { ColorRoles } from '../theme/colors';

type Props = RNTextProps & {
  variant?: TypeVariant;
  /** semantic color role; defaults to primary text */
  color?: keyof ColorRoles;
};

/** All text goes through here — guarantees the type scale + theme colors. */
export function Text({
  variant = 'body',
  color = 'text',
  style,
  ...rest
}: Props) {
  const theme = useTheme();
  const colorValue = theme.colors[color];
  return (
    <RNText
      style={[
        theme.typography[variant],
        typeof colorValue === 'string' && { color: colorValue },
        style,
      ]}
      {...rest}
    />
  );
}
