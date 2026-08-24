import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { ScanLine, ImagePlus, LayoutGrid, ChevronRight, Grid2x2, FilePen, RefreshCw } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { FolderOpen, FileText, Download, RotateCw } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { DocumentCard } from '../components/DocumentCard';
import { ActionSheet } from '../components/ActionSheet';
import { useImportImages } from '../hooks/useImportImages';
import { useAppUpdate } from '../hooks/useAppUpdate';
import { pickPdf } from '../services/pdf/pickPdf';
import { listDocuments, type DocumentMeta } from '../services/storage';
import { useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

export function HomeScreen({ navigation }: RootScreenProps<'Home'>) {
  const theme = useTheme();
  const importImages = useImportImages();
  const [recent, setRecent] = useState<DocumentMeta[]>([]);
  const [pdfSheet, setPdfSheet] = useState(false);
  const upd = useAppUpdate();

  const openExternalPdf = async () => {
    const picked = await pickPdf();
    if (picked) navigation.navigate('PdfPreview', { uri: picked.uri, name: picked.name, editable: true });
  };

  useFocusEffect(
    useCallback(() => {
      listDocuments().then(list => setRecent(list.slice(0, 3)));
    }, []),
  );

  return (
    <Screen scroll>
      <View style={styles.brand}>
        <Image source={require('../assets/logo.png')} style={styles.brandLogo} resizeMode="contain" />
        <Text variant="bodyStrong">Document Suite</Text>
      </View>

      {upd.available && (
        <Pressable
          onPress={upd.downloaded ? upd.install : upd.downloading ? undefined : upd.update}
          style={[styles.updateBar, { backgroundColor: theme.colors.brandSubtle, borderRadius: theme.radius.lg }]}
        >
          {upd.downloaded ? <RotateCw size={18} color={theme.colors.brand} /> : <Download size={18} color={theme.colors.brand} />}
          <Text variant="callout" color="brand" style={styles.updateText}>
            {upd.downloaded ? 'Update ready — tap to restart & install' : upd.downloading ? 'Downloading update…' : 'A new version is available — tap to update'}
          </Text>
        </Pressable>
      )}
      <View style={styles.heading}>
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
      <QuickRow icon={FilePen} label="PDF Editor" hint="Open a PDF to view, annotate, save copy" onPress={() => setPdfSheet(true)} />
      <QuickRow icon={Grid2x2} label="Collage Studio" hint="Beautiful photo layouts" onPress={() => navigation.navigate('CollageStudio')} />
      <QuickRow icon={ImagePlus} label="Image → PDF" hint="Photos to a shareable PDF" onPress={importImages} />
      <QuickRow icon={RefreshCw} label="Convert Image" hint="JPG · PNG · WEBP" onPress={() => navigation.navigate('Convert')} />
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

      <ActionSheet
        visible={pdfSheet}
        title="PDF Editor"
        onClose={() => setPdfSheet(false)}
        actions={[
          { label: 'Open a PDF file', icon: FolderOpen, onPress: openExternalPdf },
          { label: 'From My Documents', icon: FileText, onPress: () => navigation.navigate('Documents') },
        ]}
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
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  brandLogo: { width: 34, height: 34, borderRadius: 8 },
  updateBar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginTop: 14 },
  updateText: { flex: 1 },
  heading: { marginTop: 16, marginBottom: 20 },
  title: { marginTop: 0 },
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
