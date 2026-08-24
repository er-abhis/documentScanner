import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Text } from './Text';
import { Button } from './Button';
import { useTheme } from '../theme';

type Props = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
};

/** Useful, on-brand empty state — icon badge, guidance, optional CTA. */
export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  actionIcon,
}: Props) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.badge,
          { backgroundColor: theme.colors.brandSubtle, borderRadius: theme.radius.pill },
        ]}
      >
        <Icon size={theme.iconSize.xl} color={theme.colors.brand} />
      </View>
      <Text variant="h2" style={styles.title}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" color="textSecondary" style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button
            title={actionLabel}
            onPress={onAction}
            icon={actionIcon}
            fullWidth={false}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  badge: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginTop: 8, maxWidth: 300 },
  action: { marginTop: 24 },
});
