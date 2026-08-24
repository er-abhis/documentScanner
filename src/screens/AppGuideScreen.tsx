import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import {
  ScanLine, SlidersHorizontal, Layers, FolderOpen, FileText, Eye, LayoutGrid,
  FilePen, FolderInput, ScanText, Grid2x2, RefreshCw, Share2, Settings2, ShieldCheck,
  Sparkles,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

const SECTIONS: { icon: LucideIcon; title: string; points: string[] }[] = [
  { icon: ScanLine, title: 'Scanner', points: [
    'Native scanner with automatic edge detection and auto-crop.',
    'Perspective correction for tilted or angled pages.',
    'Capture multiple pages into one document.',
  ]},
  { icon: SlidersHorizontal, title: 'Image Lab', points: [
    'Crop with a four-corner adjuster, plus rotate.',
    'Brightness & contrast controls.',
    '12 filters: Magic, Document, B&W, Receipt, Warm, Cool, Vivid, Sepia and more.',
  ]},
  { icon: Layers, title: 'Multi-page stack', points: [
    'Add, edit, duplicate or delete pages.',
    'Drag-and-drop reordering.',
    'Edit or draw on any individual page.',
  ]},
  { icon: FolderOpen, title: 'Document library', points: [
    'Save, rename, duplicate, delete and open documents.',
    'Instant search, thumbnails, page count and date.',
    'Recent documents right on the Home screen.',
  ]},
  { icon: FileText, title: 'Image → PDF', points: [
    'Turn one or many photos into a single PDF.',
    'Pages keep each image’s size and orientation.',
    'Reorder pages before exporting.',
  ]},
  { icon: Eye, title: 'PDF viewer', points: [
    'Smooth scrolling, pinch-zoom and double-tap zoom.',
    'Page indicator, jump-to-page, scroll or paged mode.',
    'Fit-width / fit-page and immersive fullscreen.',
  ]},
  { icon: LayoutGrid, title: 'Page organizer', points: [
    'Thumbnail grid with drag-and-drop reordering.',
    'Rotate, duplicate and delete pages.',
    'Regenerates the PDF while preserving structure.',
  ]},
  { icon: FilePen, title: 'PDF editor', points: [
    'Pen, highlighter, eraser, shapes and text with undo/redo.',
    'Select real PDF text and see its detected font & size.',
    'Replace or delete existing text; always Save Copy.',
  ]},
  { icon: FolderInput, title: 'Open any PDF', points: [
    'Pick a PDF from storage or cloud providers.',
    'View, annotate or edit — scans and text PDFs alike.',
  ]},
  { icon: ScanText, title: 'OCR (extract text)', points: [
    'On-device text recognition from scans and photos.',
    'Edit the recognized text, then copy or share it.',
    'Save it back as a searchable PDF.',
  ]},
  { icon: Grid2x2, title: 'Collage Studio', points: [
    '28+ premium, data-driven templates.',
    'Drop photos into frames; pan & pinch to crop inside them.',
    'Background, spacing, radius, ratios — export JPG/PNG/WEBP/PDF.',
  ]},
  { icon: RefreshCw, title: 'Convert & resize', points: [
    'Real JPG · PNG · WEBP conversion (true transcoding).',
    'Resize by % presets or by aspect ratio, in batches.',
    'Save straight to your Photos gallery or share.',
  ]},
  { icon: Share2, title: 'Sharing', points: [
    'Native share sheet for images and PDFs.',
    'Shared files include a link to get the app.',
  ]},
  { icon: Settings2, title: 'Personalisation', points: [
    'System, Light or Dark theme.',
    'English and हिन्दी (Hindi).',
    'Haptics and optional in-app auto-update.',
  ]},
  { icon: ShieldCheck, title: 'Privacy', points: [
    '100% on-device — documents never leave your phone.',
    'No account, no ads, no analytics, no trackers.',
    'Works fully offline.',
  ]},
];

export function AppGuideScreen({ navigation }: RootScreenProps<'AppGuide'>) {
  const theme = useTheme();
  return (
    <Screen scroll padded={false}>
      <View style={styles.pad}>
        <Header title="App Guide" onBack={() => navigation.goBack()} />
      </View>

      <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.pad}>
        <LinearGradient
          colors={theme.colors.brandGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { borderRadius: theme.radius.xl }, theme.elevation(3)]}
        >
          <LinearGradient colors={['#FFFFFF44', '#FFFFFF00']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.gloss} />
          <View style={styles.heroBadge}>
            <Sparkles size={26} color={theme.colors.onBrand} />
          </View>
          <Text variant="h2" style={{ color: theme.colors.onBrand }}>Everything it can do</Text>
          <Text variant="callout" style={[styles.heroSub, { color: theme.colors.onBrand }]}>
            A complete, on-device document, PDF and image toolkit — private and offline.
          </Text>
        </LinearGradient>
      </Animated.View>

      <View style={styles.pad}>
        {SECTIONS.map((s, i) => (
          <Animated.View key={s.title} entering={FadeInDown.delay(40 + Math.min(i, 8) * 40).springify().damping(18)}>
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderColor: theme.colors.border, borderWidth: theme.mode === 'dark' ? StyleSheet.hairlineWidth : 0 }, theme.elevation(1)]}>
              <View style={styles.cardHead}>
                <View style={[styles.icon, { backgroundColor: theme.colors.brandSubtle, borderRadius: theme.radius.md }]}>
                  <s.icon size={18} color={theme.colors.brand} />
                </View>
                <Text variant="bodyStrong">{s.title}</Text>
              </View>
              {s.points.map(p => (
                <View key={p} style={styles.point}>
                  <View style={[styles.dot, { backgroundColor: theme.colors.brand }]} />
                  <Text variant="callout" color="textSecondary" style={styles.flex}>{p}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 20 },
  flex: { flex: 1 },
  hero: { alignItems: 'center', gap: 6, padding: 26, marginTop: 8, overflow: 'hidden' },
  gloss: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%' },
  heroBadge: { width: 54, height: 54, borderRadius: 16, backgroundColor: '#FFFFFF2A', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroSub: { textAlign: 'center', opacity: 0.92, marginTop: 4, maxWidth: 300 },
  card: { padding: 16, marginTop: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  icon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 7 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
});
