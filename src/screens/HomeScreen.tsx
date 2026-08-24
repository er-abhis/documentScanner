import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { ScanLine, ImagePlus, LayoutGrid, ChevronRight, Grid2x2, FilePen, RefreshCw, ChevronDown } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { FolderOpen, FileText, Download, RotateCw, User, ShieldCheck, Coffee, Sparkles, BookOpen } from 'lucide-react-native';
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

  useFocusEffect(
    useCallback(() => {
      listDocuments().then(list => setRecent(list.slice(0, 3)));
    }, []),
  );

  return (
    <Screen scroll>
      <Pressable
        onPress={() => { haptics.light(); setBrandMenu(true); }}
        accessibilityRole="button"
        accessibilityLabel="About & more"
        style={({ pressed }) => [styles.brand, pressed && { opacity: 0.6 }]}
      >
        <Image source={require('../assets/logo.png')} style={styles.brandLogo} resizeMode="contain" />
        <Text variant="bodyStrong">{t('home.brand')}</Text>
        <ChevronDown size={16} color={theme.colors.textTertiary} />
      </Pressable>

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
      <View style={styles.heading}>
        <Text variant="display" style={styles.title}>
          {t('home.title')}
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

      <Text variant="title" style={styles.sectionTitle}>
        {t('home.quickTools')}
      </Text>
      <QuickRow icon={FilePen} label={t('home.pdfEditor')} hint={t('home.pdfEditorSub')} onPress={() => setPdfSheet(true)} />
      <QuickRow icon={Grid2x2} label={t('home.collage')} hint={t('home.collageSub')} onPress={() => navigation.navigate('CollageStudio')} />
      <QuickRow icon={ImagePlus} label={t('home.imgToPdf')} hint={t('home.imgToPdfSub')} onPress={importImages} />
      <QuickRow icon={RefreshCw} label={t('home.convert')} hint={t('home.convertSub')} onPress={() => navigation.navigate('Convert')} />
      <QuickRow icon={LayoutGrid} label={t('home.allTools')} hint={t('home.allToolsSub')} onPress={() => navigation.navigate('Tools')} />

      {recent.length > 0 && (
        <>
          <View style={styles.recentHead}>
            <Text variant="title">{t('home.recent')}</Text>
            <Pressable onPress={() => navigation.navigate('Documents')} accessibilityRole="button">
              <Text variant="callout" color="brand">
                {t('home.seeAll')}
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
