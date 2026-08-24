import { Pressable, StyleSheet, View } from 'react-native';
import {
  ChevronRight,
  Info,
  Moon,
  ShieldCheck,
  Share2,
  Star,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Text } from '../components/Text';
import { useTheme } from '../theme';
import { rateApp, shareApp } from '../services/sharing';
import type { RootScreenProps } from '../types/navigation';

export function SettingsScreen({ navigation }: RootScreenProps<'Settings'>) {
  return (
    <Screen>
      <Header title="Settings" onBack={() => navigation.goBack()} />
      <Card style={styles.group}>
        <Row icon={Moon} label="Appearance" value="Follows system" />
        <Row icon={ShieldCheck} label="Processing" value="On-device only" />
        <Row icon={Info} label="Version" value="1.0.0 (dev)" last />
      </Card>
      <Card style={styles.group}>
        <Row icon={Share2} label="Share app" onPress={shareApp} />
        <Row icon={Star} label="Rate app" onPress={rateApp} last />
      </Card>
    </Screen>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  last,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  last?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const content = (
    <View
      style={[
        styles.row,
        {
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <Icon size={theme.iconSize.md} color={theme.colors.textSecondary} />
      <Text variant="body" style={styles.rowLabel}>
        {label}
      </Text>
      {value != null ? (
        <Text variant="callout" color="textSecondary">
          {value}
        </Text>
      ) : (
        <ChevronRight
          size={theme.iconSize.md}
          color={theme.colors.textSecondary}
        />
      )}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: theme.colors.border }}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  rowLabel: { flex: 1, marginLeft: 14 },
});
