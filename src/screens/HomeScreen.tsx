import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { FileText, ScanLine, Settings as SettingsIcon, ChevronRight, ImagePlus } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { useTheme } from '../theme';
import { useDraft } from '../state/draft';
import { pickImages } from '../services/gallery';
import type { RootScreenProps } from '../types/navigation';

export function HomeScreen({ navigation }: RootScreenProps<'Home'>) {
  const theme = useTheme();
  const { clear, addPages } = useDraft();

  const importImages = async () => {
    const uris = await pickImages();
    if (uris.length === 0) return;
    clear();
    addPages(uris);
    navigation.navigate('Pages');
  };

  return (
    <Screen scroll>
      <View style={styles.heading}>
        <Text variant="label" color="brand">
          DOCUMENT SCANNER
        </Text>
        <Text variant="display" style={styles.title}>
          Scan anything,{'\n'}share instantly.
        </Text>
      </View>

      {/* Hero scan card */}
      <Animated.View entering={FadeInDown.delay(60).springify().damping(18)}>
      <LinearGradient
        colors={theme.colors.brandGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { borderRadius: theme.radius.xl }, theme.elevation(2)]}
      >
        <View style={styles.heroIcon}>
          <ScanLine size={26} color={theme.colors.onBrand} />
        </View>
        <Text variant="h2" style={{ color: theme.colors.onBrand }}>
          Scan a document
        </Text>
        <Text
          variant="callout"
          style={[styles.heroSub, { color: theme.colors.onBrand }]}
        >
          Auto edge-detection, crop and enhance — right on your device.
        </Text>
        <View style={styles.heroBtn}>
          <Button
            title="Scan Document"
            icon={ScanLine}
            variant="secondary"
            fullWidth={false}
            onPress={() => navigation.navigate('Scanner')}
          />
        </View>
      </LinearGradient>
      </Animated.View>

      <Text variant="title" style={styles.sectionTitle}>
        Create
      </Text>
      <QuickRow
        icon={ImagePlus}
        label="Import Images"
        hint="Turn photos into a document or PDF"
        onPress={importImages}
      />

      <Text variant="title" style={styles.sectionTitle}>
        Library
      </Text>
      <QuickRow
        icon={FileText}
        label="My Documents"
        hint="View and manage scans"
        onPress={() => navigation.navigate('Documents')}
      />
      <QuickRow
        icon={SettingsIcon}
        label="Settings"
        hint="Preferences and about"
        onPress={() => navigation.navigate('Settings')}
      />
    </Screen>
  );
}

function QuickRow({
  icon: Icon,
  label,
  hint,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: theme.colors.border }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: theme.mode === 'dark' ? StyleSheet.hairlineWidth : 0,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.7 : 1,
        },
        theme.elevation(1),
      ]}
    >
      <View
        style={[
          styles.rowIcon,
          { backgroundColor: theme.colors.brandSubtle, borderRadius: theme.radius.md },
        ]}
      >
        <Icon size={theme.iconSize.md} color={theme.colors.brand} />
      </View>
      <View style={styles.rowText}>
        <Text variant="bodyStrong">{label}</Text>
        <Text variant="caption" color="textSecondary">
          {hint}
        </Text>
      </View>
      <ChevronRight size={theme.iconSize.md} color={theme.colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: 12, marginBottom: 20 },
  title: { marginTop: 8 },
  hero: { padding: 22, marginBottom: 28 },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF2A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroSub: { marginTop: 6, opacity: 0.9, maxWidth: 260 },
  heroBtn: { marginTop: 18, alignSelf: 'flex-start' },
  sectionTitle: { marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 12,
  },
  rowIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowText: { flex: 1 },
});
