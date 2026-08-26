import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import {
  ScanLine, ImagePlus, Grid2x2, FilePen, RefreshCw, ScanText, ChevronDown,
  FolderOpen, FileText, Download, RotateCw, User, ShieldCheck, Coffee, Sparkles,
  BookOpen, Settings as SettingsIcon,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { DocumentCard } from '../components/DocumentCard';
import { IconButton } from '../components/IconButton';
import { ActionSheet } from '../components/ActionSheet';
import { useImportImages } from '../hooks/useImportImages';
import { useAppUpdate } from '../hooks/useAppUpdate';
import { pickPdf } from '../services/pdf/pickPdf';
import { pickImages } from '../services/gallery';
import { listDocuments, type DocumentMeta } from '../services/storage';
import { useTheme } from '../theme';
import { useT } from '../i18n';
import { haptics } from '../lib/haptics';
import type { RootScreenProps } from '../types/navigation';

export function HomeScreen({ navigation }: RootScreenProps<'Home'>) {
  const theme = useTheme();
  const t = useT();
  const importImages = useImportImages();
  const [recent, setRecent] = useState<DocumentMeta[]>([]);
  const [pdfSheet, setPdfSheet] = useState(false);
  const [brandMenu, setBrandMenu] = useState(false);
  const upd = useAppUpdate();

  const openExternalPdf = async () => {
    const picked = await pickPdf();
    if (picked) navigation.navigate('PdfPreview', { uri: picked.uri, name: picked.name, editable: true });
  };

  const ocrImage = async () => {
    const [uri] = await pickImages(1);
    if (uri) navigation.navigate('Ocr', { uri, name: 'Image', kind: 'image' });
  };

  useFocusEffect(
    useCallback(() => {
      listDocuments().then(list => setRecent(list.slice(0, 3)));
    }, []),
  );

  const create: GridItem[] = [
    { icon: ImagePlus, label: t('home.imgToPdf'), hint: t('home.imgToPdfSub'), onPress: importImages },
    { icon: FolderOpen, label: t('home.openPdf'), hint: t('home.openPdfSub'), onPress: openExternalPdf },
  ];
  const tools: GridItem[] = [
    { icon: FilePen, label: t('home.pdfEditor'), hint: t('home.pdfEditorDesc'), onPress: () => setPdfSheet(true) },
    { icon: ScanText, label: t('home.ocr'), hint: t('home.ocrSub'), onPress: ocrImage },
    { icon: Grid2x2, label: t('home.collage'), hint: t('home.collageSub'), onPress: () => navigation.navigate('CollageStudio') },
    { icon: RefreshCw, label: t('home.convertShort'), hint: t('home.convertDesc'), onPress: () => navigation.navigate('Convert') },
  ];

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => { haptics.light(); setBrandMenu(true); }}
          accessibilityRole="button"
          accessibilityLabel="About & more"
          style={({ pressed }) => [styles.brand, pressed && { opacity: 0.6 }]}
        >
          <Image source={require('../assets/logo.png')} style={styles.brandLogo} resizeMode="contain" />
          <View style={styles.brandText}>
            <View style={styles.brandRow}>
              <Text variant="bodyStrong">{t('home.brand')}</Text>
              <ChevronDown size={15} color={theme.colors.textTertiary} />
            </View>
            <Text variant="caption" color="textSecondary">{t('home.subtitle')}</Text>
          </View>
        </Pressable>
        <IconButton
          icon={SettingsIcon}
          variant="surface"
          onPress={() => navigation.navigate('Settings')}
          accessibilityLabel={t('tab.settings')}
        />
      </View>

      {upd.available && (
        <Pressable
          onPress={upd.downloaded ? upd.install : upd.downloading ? undefined : upd.update}
          style={[styles.updateBar, { backgroundColor: theme.colors.brandSubtle, borderRadius: theme.radius.lg }]}
        >
          {upd.downloaded ? <RotateCw size={18} color={theme.colors.brand} /> : <Download size={18} color={theme.colors.brand} />}
          <Text variant="callout" color="brand" style={styles.updateText}>
            {upd.downloaded ? t('home.updateReady') : upd.downloading ? t('home.updating') : t('home.updateAvailable')}
          </Text>
        </Pressable>
      )}

      <Animated.View entering={FadeInDown.delay(40).springify().damping(18)}>
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
            {t('home.scanTitle')}
          </Text>
          <Text variant="callout" style={[styles.heroSub, { color: theme.colors.onBrand }]}>
            {t('home.scanSub')}
          </Text>
          <View style={styles.heroBtn}>
            <Button
              title={t('home.scanCta')}
              icon={ScanLine}
              variant="secondary"
              fullWidth={false}
              onPress={() => navigation.navigate('Scanner')}
            />
          </View>
        </LinearGradient>
      </Animated.View>

      <View style={styles.recentHead}>
        <Text variant="title">{t('home.recentDocs')}</Text>
        {recent.length > 0 && (
          <Pressable onPress={() => navigation.navigate('Documents')} accessibilityRole="button" hitSlop={8}>
            <Text variant="callout" color="brand">{t('home.seeAll')}</Text>
          </Pressable>
        )}
      </View>
      {recent.length > 0 ? (
        recent.map(doc => (
          <DocumentCard
            key={doc.id}
            doc={doc}
            onOpen={d => navigation.navigate('Document', { id: d.id })}
            onMore={d => navigation.navigate('Document', { id: d.id })}
          />
        ))
      ) : (
        <View
          style={[
            styles.empty,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.lg,
              borderWidth: theme.mode === 'dark' ? StyleSheet.hairlineWidth : 0,
              borderColor: theme.colors.border,
            },
            theme.elevation(1),
          ]}
        >
          <View style={[styles.emptyBadge, { backgroundColor: theme.colors.brandSubtle, borderRadius: theme.radius.pill }]}>
            <FileText size={theme.iconSize.lg} color={theme.colors.brand} />
          </View>
          <Text variant="bodyStrong" style={styles.emptyTitle}>{t('home.emptyTitle')}</Text>
          <Text variant="caption" color="textSecondary" style={styles.emptySub}>{t('home.emptySub')}</Text>
          <Button title={t('home.scanCta')} icon={ScanLine} fullWidth={false} onPress={() => navigation.navigate('Scanner')} />
        </View>
      )}

      <Text variant="title" style={styles.sectionTitle}>{t('home.create')}</Text>
      <Grid items={create} base={0} />

      <View style={styles.toolsHead}>
        <Text variant="title">{t('home.tools')}</Text>
        <Pressable onPress={() => navigation.navigate('Tools')} accessibilityRole="button" hitSlop={8}>
          <Text variant="callout" color="brand">{t('home.allTools')}</Text>
        </Pressable>
      </View>
      <Grid items={tools} base={2} />

      <View style={styles.privacy}>
        <View style={styles.privacyRow}>
          <ShieldCheck size={16} color={theme.colors.textSecondary} />
          <Text variant="callout" color="textSecondary">{t('home.privacyTitle')}</Text>
        </View>
        <Text variant="caption" color="textTertiary" style={styles.privacySub}>{t('home.privacySub')}</Text>
      </View>

      <ActionSheet
        visible={pdfSheet}
        title={t('home.pdfEditor')}
        onClose={() => setPdfSheet(false)}
        actions={[
          { label: t('menu.openPdf'), icon: FolderOpen, onPress: openExternalPdf },
          { label: t('menu.fromDocs'), icon: FileText, onPress: () => navigation.navigate('Documents') },
        ]}
      />

      <ActionSheet
        visible={brandMenu}
        title={t('home.brand')}
        onClose={() => setBrandMenu(false)}
        actions={[
          { label: t('settings.appGuide'), icon: BookOpen, onPress: () => navigation.navigate('AppGuide') },
          { label: t('settings.featuresFaq'), icon: Sparkles, onPress: () => navigation.navigate('Faq') },
          { label: t('settings.about'), icon: User, onPress: () => navigation.navigate('About') },
          { label: t('settings.support'), icon: Coffee, onPress: () => navigation.navigate('Coffee') },
          { label: t('settings.privacy'), icon: ShieldCheck, onPress: () => navigation.navigate('Privacy') },
        ]}
      />
    </Screen>
  );
}

type GridItem = { icon: LucideIcon; label: string; hint: string; onPress: () => void };

/** 2-column card grid — used for both Create and Tools so they read as one system. */
function Grid({ items, base }: { items: GridItem[]; base: number }) {
  const rows: GridItem[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return (
    <>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.gridRow}>
          {row.map((item, ci) => (
            <GridCard key={item.label} {...item} i={base + ri * 2 + ci} />
          ))}
          {row.length === 1 && <View style={styles.gridCard} />}
        </View>
      ))}
    </>
  );
}

function GridCard({ icon: Icon, label, hint, onPress, i }: GridItem & { i: number }) {
  const theme = useTheme();
  return (
    <AnimatedPressable
      entering={FadeInDown.delay(120 + i * 45).springify().damping(18).stiffness(160)}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: theme.colors.border }}
      style={({ pressed }: { pressed: boolean }) => [
        styles.gridCard,
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
      <View style={[styles.gridIcon, { backgroundColor: theme.colors.brandSubtle, borderRadius: theme.radius.md }]}>
        <Icon size={theme.iconSize.md} color={theme.colors.brand} />
      </View>
      <Text variant="bodyStrong" numberOfLines={1}>{label}</Text>
      <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.gridHint}>
        {hint}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  brandLogo: { width: 40, height: 40, borderRadius: 10 },
  brandText: { flex: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  updateBar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 16 },
  updateText: { flex: 1 },
  hero: { padding: 22, marginBottom: 24 },
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
  recentHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  empty: { alignItems: 'center', padding: 24, marginBottom: 8 },
  emptyBadge: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { textAlign: 'center' },
  emptySub: { textAlign: 'center', marginTop: 6, marginBottom: 18, maxWidth: 260 },
  sectionTitle: { marginTop: 20, marginBottom: 12 },
  toolsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 },
  gridRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  gridCard: { flex: 1, padding: 16, minHeight: 108, justifyContent: 'flex-start' },
  gridIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  gridHint: { marginTop: 2 },
  privacy: { alignItems: 'center', marginTop: 28 },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  privacySub: { marginTop: 4, textAlign: 'center' },
});
