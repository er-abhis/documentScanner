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
import { useI18n } from '../i18n';
import type { RootScreenProps } from '../types/navigation';

const FEATURES: { icon: LucideIcon; en: { title: string; sub: string }; hi: { title: string; sub: string } }[] = [
  { icon: ScanLine, en: { title: 'Scan documents', sub: 'Auto edge-detection, crop, perspective fix and premium filters.' }, hi: { title: 'दस्तावेज़ स्कैन करें', sub: 'ऑटो एज-डिटेक्शन, क्रॉप, परिप्रेक्ष्य सुधार और प्रीमियम फ़िल्टर।' } },
  { icon: FilePen, en: { title: 'Edit PDFs', sub: 'Replace or delete real text, add text/shapes, draw, highlight — then Save Copy.' }, hi: { title: 'PDF संपादित करें', sub: 'असली टेक्स्ट बदलें या हटाएँ, टेक्स्ट/आकृतियाँ जोड़ें, ड्रॉ करें, हाइलाइट करें — फिर कॉपी सहेजें।' } },
  { icon: ScanText, en: { title: 'OCR (extract text)', sub: 'Turn scanned pages or photos into editable, searchable text — on-device.' }, hi: { title: 'OCR (टेक्स्ट निकालें)', sub: 'स्कैन किए पेज या फ़ोटो को संपादन-योग्य, खोजने-योग्य टेक्स्ट में बदलें — डिवाइस पर।' } },
  { icon: Grid2x2, en: { title: 'Collage Studio', sub: '28+ premium layouts; drop photos into frames, then export.' }, hi: { title: 'कोलाज स्टूडियो', sub: '28+ प्रीमियम लेआउट; फ़्रेम में फ़ोटो डालें, फिर एक्सपोर्ट करें।' } },
  { icon: RefreshCw, en: { title: 'Convert & resize', sub: 'Real JPG · PNG · WEBP transcoding, resize by % or aspect ratio.' }, hi: { title: 'कन्वर्ट और रीसाइज़', sub: 'असली JPG · PNG · WEBP रूपांतरण, % या अनुपात से रीसाइज़।' } },
  { icon: Combine, en: { title: 'Image → PDF', sub: 'Merge photos into a shareable PDF with reorder and page tools.' }, hi: { title: 'इमेज → PDF', sub: 'फ़ोटो को साझा करने योग्य PDF में मिलाएँ, क्रम और पेज टूल्स के साथ।' } },
];

const FAQ: { en: { q: string; a: string }; hi: { q: string; a: string } }[] = [
  { en: { q: 'Does the app work offline?', a: 'Yes. Scanning, editing, OCR, PDF generation and conversion all run on your device — no internet required.' }, hi: { q: 'क्या ऐप ऑफ़लाइन काम करता है?', a: 'हाँ। स्कैनिंग, एडिटिंग, OCR, PDF निर्माण और रूपांतरण सब आपके डिवाइस पर चलते हैं — इंटरनेट की ज़रूरत नहीं।' } },
  { en: { q: 'Is my data private?', a: 'Completely. There are no accounts, ads, analytics or trackers. Your documents never leave your phone.' }, hi: { q: 'क्या मेरा डेटा निजी है?', a: 'पूरी तरह। कोई अकाउंट, विज्ञापन, एनालिटिक्स या ट्रैकर नहीं। आपके दस्तावेज़ कभी फ़ोन से बाहर नहीं जाते।' } },
  { en: { q: 'Can I really edit existing PDF text?', a: 'Yes — where a PDF stores selectable text, the original text is replaced in place using its own font. Scanned PDFs use OCR to extract and rebuild text.' }, hi: { q: 'क्या मैं वाकई मौजूदा PDF टेक्स्ट संपादित कर सकता हूँ?', a: 'हाँ — जहाँ PDF में चयन-योग्य टेक्स्ट होता है, वहाँ मूल टेक्स्ट उसी फ़ॉन्ट में बदला जाता है। स्कैन की गई PDF के लिए OCR से टेक्स्ट निकालकर पुनर्निर्माण होता है।' } },
  { en: { q: 'Which image formats are supported?', a: 'JPG, PNG and WEBP for real conversion, plus PDF export. Converted images can be saved straight to your Photos gallery.' }, hi: { q: 'कौन-कौन से इमेज फ़ॉर्मेट समर्थित हैं?', a: 'असली रूपांतरण के लिए JPG, PNG और WEBP, साथ ही PDF एक्सपोर्ट। बदली गई इमेज सीधे आपकी फ़ोटो गैलरी में सहेजी जा सकती हैं।' } },
  { en: { q: 'Where are my saved files?', a: 'Documents live in the app’s Documents tab; converted images are saved to your Photos gallery. You can share or export anything at any time.' }, hi: { q: 'मेरी सहेजी फ़ाइलें कहाँ हैं?', a: 'दस्तावेज़ ऐप के Documents टैब में रहते हैं; बदली गई इमेज आपकी फ़ोटो गैलरी में सहेजी जाती हैं। आप कभी भी कुछ भी साझा या एक्सपोर्ट कर सकते हैं।' } },
  { en: { q: 'Is it free?', a: 'Yes, the core features are free and run locally. Optional tips help fund development.' }, hi: { q: 'क्या यह मुफ़्त है?', a: 'हाँ, मुख्य फ़ीचर्स मुफ़्त हैं और लोकल रूप से चलते हैं। वैकल्पिक टिप डेवलपमेंट में मदद करती हैं।' } },
];

export function FaqScreen({ navigation }: RootScreenProps<'Faq'>) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  return (
    <Screen scroll>
      <Header title={t('faq.title')} onBack={() => navigation.goBack()} />

      <View style={styles.badges}>
        <View style={[styles.badge, { backgroundColor: theme.colors.brandSubtle, borderRadius: theme.radius.pill }]}>
          <ShieldCheck size={14} color={theme.colors.brand} />
          <Text variant="caption" color="brand">{t('faq.onDevice')}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: theme.colors.brandSubtle, borderRadius: theme.radius.pill }]}>
          <WifiOff size={14} color={theme.colors.brand} />
          <Text variant="caption" color="brand">{t('faq.offline')}</Text>
        </View>
      </View>

      <Text variant="title" style={styles.h}>{t('faq.whatYouCanDo')}</Text>
      {FEATURES.map((f, i) => (
        <Animated.View key={f.en.title} entering={FadeInDown.delay(40 + i * 40).springify().damping(18)}>
          <View style={[styles.row, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderColor: theme.colors.border, borderWidth: theme.mode === 'dark' ? StyleSheet.hairlineWidth : 0 }, theme.elevation(1)]}>
            <View style={[styles.icon, { backgroundColor: theme.colors.brandSubtle, borderRadius: theme.radius.md }]}>
              <f.icon size={18} color={theme.colors.brand} />
            </View>
            <View style={styles.flex}>
              <Text variant="bodyStrong">{f[lang].title}</Text>
              <Text variant="caption" color="textSecondary">{f[lang].sub}</Text>
            </View>
          </View>
        </Animated.View>
      ))}

      <Text variant="title" style={[styles.h, styles.hTop]}>{t('faq.faqTitle')}</Text>
      {FAQ.map(item => (
        <View key={item.en.q} style={styles.faq}>
          <Text variant="bodyStrong" style={styles.q}>{item[lang].q}</Text>
          <Text variant="callout" color="textSecondary" style={styles.a}>{item[lang].a}</Text>
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
