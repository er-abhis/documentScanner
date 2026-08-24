import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../theme';

type Props = {
  /** meaningful status, e.g. "Detecting document…", "Creating PDF…" */
  label?: string;
};

/** Full-area loading with meaningful status text (never a fake progress bar). */
export function LoadingState({ label }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={theme.colors.brand} />
      {label ? (
        <Text variant="callout" color="textSecondary" style={styles.label}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 14 },
});
