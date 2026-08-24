import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ScanLine, FilePen, ScanText, Grid2x2, RefreshCw, Combine, ShieldCheck, WifiOff,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

const FEATURES: { icon: LucideIcon; title: string; sub: string }[] = [
  { icon: ScanLine, title: 'Scan documents', sub: 'Auto edge-detection, crop, perspective fix and premium filters.' },
  { icon: FilePen, title: 'Edit PDFs', sub: 'Replace or delete real text, add text/shapes, draw, highlight — then Save Copy.' },
  { icon: ScanText, title: 'OCR (extract text)', sub: 'Turn scanned pages or photos into editable, searchable text — on-device.' },
  { icon: Grid2x2, title: 'Collage Studio', sub: '28+ premium layouts; drop photos into frames, then export.' },
  { icon: RefreshCw, title: 'Convert & resize', sub: 'Real JPG · PNG · WEBP transcoding, resize by % or aspect ratio.' },
  { icon: Combine, title: 'Image → PDF', sub: 'Merge photos into a shareable PDF with reorder and page tools.' },
];

const FAQ: { q: string; a: string }[] = [
  { q: 'Does the app work offline?', a: 'Yes. Scanning, editing, OCR, PDF generation and conversion all run on your device — no internet required.' },
  { q: 'Is my data private?', a: 'Completely. There are no accounts, ads, analytics or trackers. Your documents never leave your phone.' },
  { q: 'Can I really edit existing PDF text?', a: 'Yes — where a PDF stores selectable text, the original text is replaced in place using its own font. Scanned PDFs use OCR to extract and rebuild text.' },
  { q: 'Which image formats are supported?', a: 'JPG, PNG and WEBP for real conversion, plus PDF export. Converted images can be saved straight to your Photos gallery.' },
  { q: 'Where are my saved files?', a: 'Documents live in the app’s Documents tab; converted images are saved to your Photos gallery. You can share or export anything at any time.' },
  { q: 'Is it free?', a: 'Yes, the core features are free and run locally. Optional tips help fund development.' },
];

export function FaqScreen({ navigation }: RootScreenProps<'Faq'>) {
  const theme = useTheme();
  return (
    <Screen scroll>
      <Header title="Features & FAQ" onBack={() => navigation.goBack()} />

      <View style={styles.badges}>
        <View style={[styles.badge, { backgroundColor: theme.colors.brandSubtle, borderRadius: theme.radius.pill }]}>
          <ShieldCheck size={14} color={theme.colors.brand} />
          <Text variant="caption" color="brand">On-device</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: theme.colors.brandSubtle, borderRadius: theme.radius.pill }]}>
          <WifiOff size={14} color={theme.colors.brand} />
          <Text variant="caption" color="brand">Works offline</Text>
        </View>
      </View>

      <Text variant="title" style={styles.h}>What you can do</Text>
      {FEATURES.map((f, i) => (
        <Animated.View key={f.title} entering={FadeInDown.delay(40 + i * 40).springify().damping(18)}>
          <View style={[styles.row, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderColor: theme.colors.border, borderWidth: theme.mode === 'dark' ? StyleSheet.hairlineWidth : 0 }, theme.elevation(1)]}>
            <View style={[styles.icon, { backgroundColor: theme.colors.brandSubtle, borderRadius: theme.radius.md }]}>
              <f.icon size={18} color={theme.colors.brand} />
            </View>
            <View style={styles.flex}>
              <Text variant="bodyStrong">{f.title}</Text>
              <Text variant="caption" color="textSecondary">{f.sub}</Text>
            </View>
          </View>
        </Animated.View>
      ))}

      <Text variant="title" style={[styles.h, styles.hTop]}>FAQ</Text>
      {FAQ.map(item => (
        <View key={item.q} style={styles.faq}>
          <Text variant="bodyStrong" style={styles.q}>{item.q}</Text>
          <Text variant="callout" color="textSecondary" style={styles.a}>{item.a}</Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  badges: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  h: { marginTop: 16, marginBottom: 12 },
  hTop: { marginTop: 26 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, marginBottom: 10 },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  faq: { marginBottom: 18 },
  q: { marginBottom: 5 },
  a: { lineHeight: 21 },
});
