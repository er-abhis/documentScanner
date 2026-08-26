import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import {
  ScanLine, ImagePlus, Grid2x2, FilePen, RefreshCw, ScanText, ArrowRight, ChevronRight,
  FolderOpen, FileText, Download, RotateCw, User, ShieldCheck, Coffee, Sparkles,
  BookOpen, Menu, Bell, Crown, Lock, Wand2, Layers, FileDown, Grid3x3, Check, Wifi,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { DocumentCard } from '../components/DocumentCard';
import { ActionSheet } from '../components/ActionSheet';
import { useToast } from '../components/Toast';
import { useImportImages } from '../hooks/useImportImages';
import { useAppUpdate } from '../hooks/useAppUpdate';
import { pickPdf } from '../services/pdf/pickPdf';
import { pickImages } from '../services/gallery';
import { saveToGallery } from '../services/gallery/save';
import { listDocuments, type DocumentMeta } from '../services/storage';
import { useTheme, type Theme } from '../theme';
import { useT } from '../i18n';
import { haptics } from '../lib/haptics';
import type { RootScreenProps } from '../types/navigation';

export function HomeScreen({ navigation }: RootScreenProps<'Home'>) {
  const theme = useTheme();
  const t = useT();
  const { width } = useWindowDimensions();
  const toast = useToast();
  const importImages = useImportImages();
  const [recent, setRecent] = useState<DocumentMeta[]>([]);
  const [pdfSheet, setPdfSheet] = useState(false);
  const [menu, setMenu] = useState(false);
  const upd = useAppUpdate();

  const toolCols = width >= 700 ? 4 : 2;

  const openExternalPdf = async () => {
    const picked = await pickPdf();
    if (picked) navigation.navigate('PdfPreview', { uri: picked.uri, name: picked.name, editable: true });
  };
  const ocrImage = async () => {
    const [uri] = await pickImages(1);
    if (uri) navigation.navigate('Ocr', { uri, name: 'Image', kind: 'image' });
  };
  const imageLab = async () => {
    const [uri] = await pickImages(1);
    if (!uri) return;
    navigation.navigate('Editor', {
      uri,
      onDone: async out => {
        try { await saveToGallery(out); haptics.success(); toast({ variant: 'success', message: t('convert.savedTitle') }); }
        catch { toast({ variant: 'error', message: t('convert.saveFailMsg') }); }
      },
    });
  };

  useFocusEffect(
    useCallback(() => {
      listDocuments().then(list => setRecent(list.slice(0, 8)));
    }, []),
  );

  const quick: AccentItem[] = [
    { icon: FilePen, tint: theme.colors.brand, label: t('home.createPdf'), hint: t('home.createPdfSub'), onPress: importImages },
    { icon: FolderOpen, tint: theme.colors.star, label: t('home.openPdf'), hint: t('home.openPdfBrowse'), onPress: openExternalPdf },
    { icon: ImagePlus, tint: theme.colors.accent, label: t('home.imgToPdf'), hint: t('home.imgToPdfConv'), onPress: importImages },
  ];

  const tools: AccentItem[] = [
    { icon: FilePen, tint: theme.colors.brand, label: t('home.pdfEditor'), hint: t('home.pdfEditorDesc'), onPress: () => setPdfSheet(true) },
    { icon: ScanText, tint: theme.colors.accent, label: t('home.ocr'), hint: t('home.ocrSub'), onPress: ocrImage },
    { icon: Wand2, tint: theme.colors.success, label: t('home.imageLab'), hint: t('home.imageLabSub'), onPress: imageLab },
    { icon: Grid2x2, tint: theme.colors.star, label: t('home.collage'), hint: t('home.collageSub'), onPress: () => navigation.navigate('CollageStudio') },
    { icon: RefreshCw, tint: theme.colors.warning, label: t('home.convertShort'), hint: t('home.convertDesc'), onPress: () => navigation.navigate('Convert') },
    { icon: Layers, tint: theme.colors.brand, label: t('home.organize'), hint: t('home.organizeSub'), onPress: () => navigation.navigate('Documents') },
    { icon: FileDown, tint: theme.colors.accent, label: t('home.compress'), hint: t('home.compressSub'), onPress: openExternalPdf },
    { icon: Grid3x3, tint: theme.colors.textSecondary, label: t('home.moreTools'), hint: t('home.moreToolsSub'), onPress: () => navigation.navigate('Tools') },
  ];

  return (
    <Screen scroll>
      {/* ambient glows */}
      <View pointerEvents="none" style={[styles.glow, styles.glowTop, { backgroundColor: theme.colors.brand }]} />
      <View pointerEvents="none" style={[styles.glow, styles.glowCyan, { backgroundColor: theme.colors.accent }]} />

      {/* header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => { haptics.light(); setMenu(true); }}
          accessibilityRole="button"
          accessibilityLabel="Menu"
          style={({ pressed }) => [styles.iconSquare, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border, borderRadius: theme.radius.md }, pressed && { opacity: 0.6 }]}
        >
          <Menu size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text variant="h2" numberOfLines={1}>{t('home.brand')}</Text>
          <View style={styles.subRow}>
            <Text variant="caption" color="textSecondary" numberOfLines={1}>{t('home.subtitle')}</Text>
            <Lock size={12} color={theme.colors.brand} />
          </View>
        </View>
        <Pressable
          onPress={() => navigation.navigate('Coffee')}
          accessibilityRole="button"
          accessibilityLabel={t('home.pro')}
          style={[styles.proPill, { backgroundColor: theme.colors.star + '1F', borderColor: theme.colors.star + '55', borderRadius: theme.radius.pill }]}
        >
          <Crown size={13} color={theme.colors.star} />
          <Text variant="label" style={{ color: theme.colors.star }}>{t('home.pro')}</Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate('Faq')}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          style={({ pressed }) => [styles.iconSquare, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border, borderRadius: theme.radius.md }, pressed && { opacity: 0.6 }]}
        >
          <Bell size={20} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      {/* privacy badges */}
      <View style={styles.badges}>
        <Badge theme={theme} icon={Check} tint={theme.colors.success} label={t('home.bNoAccount')} />
        <Badge theme={theme} icon={Check} tint={theme.colors.success} label={t('home.bNoAds')} />
        <Badge theme={theme} icon={Check} tint={theme.colors.success} label={t('home.bNoTracking')} />
        <Badge theme={theme} icon={Wifi} tint={theme.colors.accent} label={t('home.bOffline')} />
      </View>

      {upd.available && (
        <Pressable
          onPress={upd.downloaded ? upd.install : upd.downloading ? undefined : upd.update}
          style={[styles.updateBar, { backgroundColor: theme.colors.brandSubtle, borderRadius: theme.radius.lg, borderColor: theme.colors.border }]}
        >
          {upd.downloaded ? <RotateCw size={18} color={theme.colors.brand} /> : <Download size={18} color={theme.colors.brand} />}
          <Text variant="callout" color="brand" style={styles.flex1}>
            {upd.downloaded ? t('home.updateReady') : upd.downloading ? t('home.updating') : t('home.updateAvailable')}
          </Text>
        </Pressable>
      )}

      {/* SCAN — primary CTA */}
      <Animated.View entering={FadeInDown.delay(40).springify().damping(18)} style={styles.scanShadow}>
        <Pressable onPress={() => { haptics.light(); navigation.navigate('Scanner'); }} accessibilityRole="button" accessibilityLabel={t('home.scanCta')}>
          {({ pressed }) => (
            <LinearGradient
              colors={['#171A5C', '#24136B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.scanCard, { borderRadius: theme.radius.xl, borderColor: theme.colors.brand + '66', opacity: pressed ? 0.92 : 1 }]}
            >
              <Image source={require('../assets/hero_doc.png')} style={styles.scanDeco} resizeMode="contain" pointerEvents="none" />
              <View style={[styles.scanIcon, { backgroundColor: '#FFFFFF1A', borderRadius: theme.radius.lg }]}>
                <ScanLine size={34} color="#FFFFFF" />
              </View>
              <View style={styles.scanTextWrap}>
                <Text variant="h1" style={styles.white}>{t('home.scanCta')}</Text>
                <Text variant="callout" style={styles.scanSub}>{t('home.scanCardSub')}</Text>
              </View>
              <LinearGradient colors={theme.colors.brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.scanArrow}>
                <ArrowRight size={22} color="#FFFFFF" />
              </LinearGradient>
            </LinearGradient>
          )}
        </Pressable>
      </Animated.View>

      {/* quick actions */}
      <View style={styles.quickRow}>
        {quick.map((q, i) => (
          <AccentCard key={q.label} {...q} i={i} theme={theme} compact />
        ))}
      </View>

      {/* Tools */}
      <View style={styles.sectionHead}>
        <View style={styles.rowCenter}>
          <Text variant="title">{t('home.tools')}</Text>
          <Sparkles size={15} color={theme.colors.star} style={styles.ml6} />
        </View>
        <Pressable onPress={() => navigation.navigate('Tools')} accessibilityRole="button" hitSlop={8} style={styles.rowCenter}>
          <Text variant="callout" color="brand">{t('home.viewAll')}</Text>
          <ChevronRight size={16} color={theme.colors.brand} />
        </Pressable>
      </View>
      <View style={[styles.toolsWrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.xl }]}>
        <View style={styles.grid}>
          {tools.map((tool, i) => (
            <View key={tool.label} style={{ width: `${100 / toolCols}%` }}>
              <AccentCard {...tool} i={i} theme={theme} grid />
            </View>
          ))}
        </View>
      </View>

      {/* Recent Documents */}
      <View style={styles.sectionHead}>
        <Text variant="title">{t('home.recentDocs')}</Text>
        {recent.length > 0 && (
          <Pressable onPress={() => navigation.navigate('Documents')} accessibilityRole="button" hitSlop={8} style={styles.rowCenter}>
            <Text variant="callout" color="brand">{t('home.seeAll')}</Text>
            <ChevronRight size={16} color={theme.colors.brand} />
          </Pressable>
        )}
      </View>
      {recent.length > 0 ? (
        recent.slice(0, 3).map(doc => (
          <DocumentCard
            key={doc.id}
            doc={doc}
            onOpen={d => navigation.navigate('Document', { id: d.id })}
            onMore={d => navigation.navigate('Document', { id: d.id })}
          />
        ))
      ) : (
        <View style={[styles.empty, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.lg }]}>
          <View style={[styles.emptyBadge, { backgroundColor: theme.colors.brandSubtle, borderRadius: theme.radius.pill }]}>
            <FileText size={26} color={theme.colors.brand} />
          </View>
          <Text variant="bodyStrong" style={styles.center}>{t('home.emptyTitle')}</Text>
          <Text variant="caption" color="textSecondary" style={[styles.center, styles.emptySub]}>{t('home.emptySub')}</Text>
          <Button title={t('home.scanCta')} icon={ScanLine} fullWidth={false} onPress={() => navigation.navigate('Scanner')} />
        </View>
      )}

      {/* Privacy card */}
      <LinearGradient
        colors={[theme.colors.successSubtle, theme.colors.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.privacyCard, { borderRadius: theme.radius.lg, borderColor: theme.colors.success + '44' }]}
      >
        <View style={[styles.privacyIcon, { backgroundColor: theme.colors.success + '22', borderRadius: theme.radius.md }]}>
          <ShieldCheck size={22} color={theme.colors.success} />
        </View>
        <View style={styles.flex1}>
          <Text variant="bodyStrong">{t('home.privacyCardTitle')}</Text>
          <Text variant="caption" color="textSecondary" style={styles.privacySub}>{t('home.privacyCardSub')}</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Privacy')} accessibilityRole="button" hitSlop={8}>
          <Text variant="callout" style={{ color: theme.colors.success }}>{t('home.learnMore')}</Text>
        </Pressable>
      </LinearGradient>

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
        visible={menu}
        title={t('home.brand')}
        onClose={() => setMenu(false)}
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

type AccentItem = { icon: LucideIcon; tint: string; label: string; hint: string; onPress: () => void };

function Badge({ theme, icon: Icon, tint, label }: { theme: Theme; icon: LucideIcon; tint: string; label: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.pill }]}>
      <Icon size={12} color={tint} />
      <Text variant="label" color="textSecondary">{label}</Text>
    </View>
  );
}

function AccentCard({ icon: Icon, tint, label, hint, onPress, i, theme, compact, grid }: AccentItem & { i: number; theme: Theme; compact?: boolean; grid?: boolean }) {
  return (
    <AnimatedPressable
      entering={FadeInDown.delay(100 + i * 45).springify().damping(18).stiffness(160)}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: theme.colors.border }}
      style={({ pressed }: { pressed: boolean }) => [
        compact ? styles.quickCard : styles.gridCard,
        {
          backgroundColor: grid ? 'transparent' : theme.colors.surface,
          borderColor: theme.colors.border,
          borderWidth: grid ? 0 : StyleSheet.hairlineWidth,
          borderRadius: theme.radius.lg,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={[styles.accentIcon, { backgroundColor: tint + '22', borderColor: tint + '3A', borderRadius: theme.radius.md }]}>
        <Icon size={22} color={tint} />
      </View>
      <Text variant="bodyStrong" numberOfLines={1} style={styles.cardLabel}>{label}</Text>
      <Text variant="caption" color="textSecondary" numberOfLines={2} style={styles.cardHint}>{hint}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  center: { textAlign: 'center' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  ml6: { marginLeft: 6 },
  white: { color: '#FFFFFF' },

  glow: { position: 'absolute', width: 340, height: 340, borderRadius: 170, opacity: 0.12 },
  glowTop: { top: -120, right: -80 },
  glowCyan: { top: 120, left: -140, opacity: 0.08 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 16 },
  iconSquare: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  headerText: { flex: 1 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  proPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, height: 32, borderWidth: StyleSheet.hairlineWidth },

  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderWidth: StyleSheet.hairlineWidth },

  updateBar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 16, borderWidth: StyleSheet.hairlineWidth },

  scanShadow: {
    marginBottom: 16,
    shadowColor: '#7B61FF',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  scanCard: { flexDirection: 'row', alignItems: 'center', padding: 22, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  scanDeco: { position: 'absolute', right: -18, top: -10, width: 150, height: 150, opacity: 0.9 },
  scanIcon: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  scanTextWrap: { flex: 1, marginLeft: 16 },
  scanSub: { color: '#D7D2FF', marginTop: 4 },
  scanArrow: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  quickCard: { flex: 1, padding: 14, minHeight: 112 },
  gridCard: { padding: 12, minHeight: 118 },
  accentIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderWidth: StyleSheet.hairlineWidth },
  cardLabel: { marginBottom: 2 },
  cardHint: { lineHeight: 16 },

  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  toolsWrap: { padding: 6, marginBottom: 24, borderWidth: StyleSheet.hairlineWidth },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },

  empty: { alignItems: 'center', padding: 24, marginBottom: 24, borderWidth: StyleSheet.hairlineWidth },
  emptyBadge: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptySub: { marginTop: 6, marginBottom: 18, maxWidth: 260 },

  privacyCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth },
  privacyIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  privacySub: { marginTop: 3, lineHeight: 17 },
});
