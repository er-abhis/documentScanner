import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { ScanLine, ImagePlus, LayoutGrid, ChevronRight, Grid2x2 } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { DocumentCard } from '../components/DocumentCard';
import { useImportImages } from '../hooks/useImportImages';
import { listDocuments, type DocumentMeta } from '../services/storage';
import { useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

export function HomeScreen({ navigation }: RootScreenProps<'Home'>) {
  const theme = useTheme();
  const importImages = useImportImages();
  const [recent, setRecent] = useState<DocumentMeta[]>([]);

  useFocusEffect(
    useCallback(() => {
      listDocuments().then(list => setRecent(list.slice(0, 3)));
    }, []),
  );

  return (
    <Screen scroll>
      <View style={styles.heading}>
        <Text variant="label" color="brand">
          DOCUMENT SUITE
        </Text>
        <Text variant="display" style={styles.title}>
          Scan, edit,{'\n'}share instantly.
        </Text>
      </View>

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
          <Text variant="callout" style={[styles.heroSub, { color: theme.colors.onBrand }]}>
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
        Quick tools
      </Text>
      <QuickRow icon={Grid2x2} label="Collage Studio" hint="Beautiful photo layouts" onPress={() => navigation.navigate('CollageStudio')} />
      <QuickRow icon={ImagePlus} label="Image → PDF" hint="Photos to a shareable PDF" onPress={importImages} />
      <QuickRow icon={LayoutGrid} label="All Tools" hint="Every tool in one place" onPress={() => navigation.navigate('Tools')} />

      {recent.length > 0 && (
        <>
          <View style={styles.recentHead}>
            <Text variant="title">Recent</Text>
            <Pressable onPress={() => navigation.navigate('Documents')} accessibilityRole="button">
              <Text variant="callout" color="brand">
                See all
              </Text>
            </Pressable>
          </View>
          {recent.map(doc => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onOpen={d => navigation.navigate('Document', { id: d.id })}
              onMore={d => navigation.navigate('Document', { id: d.id })}
            />
          ))}
        </>
      )}
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
      <View style={[styles.rowIcon, { backgroundColor: theme.colors.brandSubtle, borderRadius: theme.radius.md }]}>
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
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 12 },
  rowIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  rowText: { flex: 1 },
  recentHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 12 },
});
