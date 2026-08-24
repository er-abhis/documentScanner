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
import { useI18n } from '../i18n';
import type { RootScreenProps } from '../types/navigation';

type Sec = { icon: LucideIcon; en: { title: string; points: string[] }; hi: { title: string; points: string[] } };

const SECTIONS: Sec[] = [
  { icon: ScanLine,
    en: { title: 'Scanner', points: [
      'Native scanner with automatic edge detection and auto-crop.',
      'Perspective correction for tilted or angled pages.',
      'Capture multiple pages into one document.',
    ]},
    hi: { title: 'स्कैनर', points: [
      'ऑटोमैटिक एज-डिटेक्शन और ऑटो-क्रॉप वाला नेटिव स्कैनर।',
      'तिरछे या झुके हुए पेजों के लिए परिप्रेक्ष्य सुधार।',
      'कई पेजों को एक दस्तावेज़ में कैप्चर करें।',
    ]}},
  { icon: SlidersHorizontal,
    en: { title: 'Image Lab', points: [
      'Crop with a four-corner adjuster, plus rotate.',
      'Brightness & contrast controls.',
      '12 filters: Magic, Document, B&W, Receipt, Warm, Cool, Vivid, Sepia and more.',
    ]},
    hi: { title: 'इमेज लैब', points: [
      'चार-कोने वाले एडजस्टर से क्रॉप, साथ ही रोटेट।',
      'ब्राइटनेस और कंट्रास्ट नियंत्रण।',
      '12 फ़िल्टर: Magic, Document, B&W, Receipt, Warm, Cool, Vivid, Sepia और अधिक।',
    ]}},
  { icon: Layers,
    en: { title: 'Multi-page stack', points: [
      'Add, edit, duplicate or delete pages.',
      'Drag-and-drop reordering.',
      'Edit or draw on any individual page.',
    ]},
    hi: { title: 'मल्टी-पेज स्टैक', points: [
      'पेज जोड़ें, संपादित करें, डुप्लिकेट करें या हटाएँ।',
      'ड्रैग-एंड-ड्रॉप से क्रम बदलें।',
      'किसी भी अलग पेज पर संपादन या ड्रॉ करें।',
    ]}},
  { icon: FolderOpen,
    en: { title: 'Document library', points: [
      'Save, rename, duplicate, delete and open documents.',
      'Instant search, thumbnails, page count and date.',
      'Recent documents right on the Home screen.',
    ]},
    hi: { title: 'दस्तावेज़ लाइब्रेरी', points: [
      'दस्तावेज़ सहेजें, नाम बदलें, डुप्लिकेट करें, हटाएँ और खोलें।',
      'तुरंत खोज, थंबनेल, पेज गिनती और तारीख़।',
      'हाल के दस्तावेज़ सीधे होम स्क्रीन पर।',
    ]}},
  { icon: FileText,
    en: { title: 'Image → PDF', points: [
      'Turn one or many photos into a single PDF.',
      'Pages keep each image’s size and orientation.',
      'Reorder pages before exporting.',
    ]},
    hi: { title: 'इमेज → PDF', points: [
      'एक या कई फ़ोटो को एक ही PDF में बदलें।',
      'पेज हर इमेज का आकार और अभिविन्यास बनाए रखते हैं।',
      'एक्सपोर्ट से पहले पेजों का क्रम बदलें।',
    ]}},
  { icon: Eye,
    en: { title: 'PDF viewer', points: [
      'Smooth scrolling, pinch-zoom and double-tap zoom.',
      'Page indicator, jump-to-page, scroll or paged mode.',
      'Fit-width / fit-page and immersive fullscreen.',
    ]},
    hi: { title: 'PDF व्यूअर', points: [
      'स्मूद स्क्रॉलिंग, पिंच-ज़ूम और डबल-टैप ज़ूम।',
      'पेज इंडिकेटर, जंप-टू-पेज, स्क्रॉल या पेज्ड मोड।',
      'फ़िट-विड्थ / फ़िट-पेज और इमर्सिव फ़ुलस्क्रीन।',
    ]}},
  { icon: LayoutGrid,
    en: { title: 'Page organizer', points: [
      'Thumbnail grid with drag-and-drop reordering.',
      'Rotate, duplicate and delete pages.',
      'Regenerates the PDF while preserving structure.',
    ]},
    hi: { title: 'पेज ऑर्गनाइज़र', points: [
      'ड्रैग-एंड-ड्रॉप क्रम बदलाव वाला थंबनेल ग्रिड।',
      'पेज रोटेट, डुप्लिकेट और हटाएँ।',
      'संरचना बनाए रखते हुए PDF को फिर से बनाता है।',
    ]}},
  { icon: FilePen,
    en: { title: 'PDF editor', points: [
      'Pen, highlighter, eraser, shapes and text with undo/redo.',
      'Select real PDF text and see its detected font & size.',
      'Replace or delete existing text; always Save Copy.',
    ]},
    hi: { title: 'PDF एडिटर', points: [
      'पेन, हाइलाइटर, इरेज़र, आकृतियाँ और टेक्स्ट, undo/redo के साथ।',
      'असली PDF टेक्स्ट चुनें और उसका पहचाना गया फ़ॉन्ट और आकार देखें।',
      'मौजूदा टेक्स्ट बदलें या हटाएँ; हमेशा कॉपी सहेजें।',
    ]}},
  { icon: FolderInput,
    en: { title: 'Open any PDF', points: [
      'Pick a PDF from storage or cloud providers.',
      'View, annotate or edit — scans and text PDFs alike.',
    ]},
    hi: { title: 'कोई भी PDF खोलें', points: [
      'स्टोरेज या क्लाउड प्रदाताओं से PDF चुनें।',
      'देखें, एनोटेट करें या संपादित करें — स्कैन और टेक्स्ट PDF दोनों।',
    ]}},
  { icon: ScanText,
    en: { title: 'OCR (extract text)', points: [
      'On-device text recognition from scans and photos.',
      'Edit the recognized text, then copy or share it.',
      'Save it back as a searchable PDF.',
    ]},
    hi: { title: 'OCR (टेक्स्ट निकालें)', points: [
      'स्कैन और फ़ोटो से डिवाइस पर टेक्स्ट पहचान।',
      'पहचाने गए टेक्स्ट को संपादित करें, फिर कॉपी या साझा करें।',
      'इसे खोजने-योग्य PDF के रूप में वापस सहेजें।',
    ]}},
  { icon: Grid2x2,
    en: { title: 'Collage Studio', points: [
      '28+ premium, data-driven templates.',
      'Drop photos into frames; pan & pinch to crop inside them.',
      'Background, spacing, radius, ratios — export JPG/PNG/WEBP/PDF.',
    ]},
    hi: { title: 'कोलाज स्टूडियो', points: [
      '28+ प्रीमियम, डेटा-संचालित टेम्पलेट।',
      'फ़्रेम में फ़ोटो डालें; अंदर क्रॉप करने के लिए पैन और पिंच करें।',
      'बैकग्राउंड, स्पेसिंग, रेडियस, अनुपात — JPG/PNG/WEBP/PDF एक्सपोर्ट।',
    ]}},
  { icon: RefreshCw,
    en: { title: 'Convert & resize', points: [
      'Real JPG · PNG · WEBP conversion (true transcoding).',
      'Resize by % presets or by aspect ratio, in batches.',
      'Save straight to your Photos gallery or share.',
    ]},
    hi: { title: 'कन्वर्ट और रीसाइज़', points: [
      'असली JPG · PNG · WEBP रूपांतरण (सच्चा ट्रांसकोडिंग)।',
      '% प्रीसेट या अनुपात से, बैच में रीसाइज़ करें।',
      'सीधे अपनी फ़ोटो गैलरी में सहेजें या साझा करें।',
    ]}},
  { icon: Share2,
    en: { title: 'Sharing', points: [
      'Native share sheet for images and PDFs.',
      'Shared files include a link to get the app.',
    ]},
    hi: { title: 'साझाकरण', points: [
      'इमेज और PDF के लिए नेटिव शेयर शीट।',
      'साझा की गई फ़ाइलों में ऐप पाने का लिंक होता है।',
    ]}},
  { icon: Settings2,
    en: { title: 'Personalisation', points: [
      'System, Light or Dark theme.',
      'English and हिन्दी (Hindi).',
      'Haptics and optional in-app auto-update.',
    ]},
    hi: { title: 'वैयक्तिकरण', points: [
      'सिस्टम, लाइट या डार्क थीम।',
      'English और हिन्दी।',
      'हैप्टिक्स और वैकल्पिक इन-ऐप ऑटो-अपडेट।',
    ]}},
  { icon: ShieldCheck,
    en: { title: 'Privacy', points: [
      '100% on-device — documents never leave your phone.',
      'No account, no ads, no analytics, no trackers.',
      'Works fully offline.',
    ]},
    hi: { title: 'गोपनीयता', points: [
      '100% डिवाइस पर — दस्तावेज़ कभी आपके फ़ोन से बाहर नहीं जाते।',
      'कोई अकाउंट नहीं, विज्ञापन नहीं, एनालिटिक्स नहीं, ट्रैकर नहीं।',
      'पूरी तरह ऑफ़लाइन काम करता है।',
    ]}},
];

export function AppGuideScreen({ navigation }: RootScreenProps<'AppGuide'>) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  return (
    <Screen scroll padded={false}>
      <View style={styles.pad}>
        <Header title={t('guide.title')} onBack={() => navigation.goBack()} />
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
          <Text variant="h2" style={{ color: theme.colors.onBrand }}>{t('guide.heroTitle')}</Text>
          <Text variant="callout" style={[styles.heroSub, { color: theme.colors.onBrand }]}>
            {t('guide.heroSub')}
          </Text>
        </LinearGradient>
      </Animated.View>

      <View style={styles.pad}>
        {SECTIONS.map((s, i) => (
          <Animated.View key={s.en.title} entering={FadeInDown.delay(40 + Math.min(i, 8) * 40).springify().damping(18)}>
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderColor: theme.colors.border, borderWidth: theme.mode === 'dark' ? StyleSheet.hairlineWidth : 0 }, theme.elevation(1)]}>
              <View style={styles.cardHead}>
                <View style={[styles.icon, { backgroundColor: theme.colors.brandSubtle, borderRadius: theme.radius.md }]}>
                  <s.icon size={18} color={theme.colors.brand} />
                </View>
                <Text variant="bodyStrong">{s[lang].title}</Text>
              </View>
              {s[lang].points.map(p => (
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
