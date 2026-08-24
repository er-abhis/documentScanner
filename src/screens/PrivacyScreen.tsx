import { StyleSheet, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { useTheme } from '../theme';
import { useI18n } from '../i18n';
import type { RootScreenProps } from '../types/navigation';

const SECTIONS: { en: { title: string; body: string }; hi: { title: string; body: string } }[] = [
  {
    en: { title: 'What this app does', body: 'Document Suite lets you scan documents, edit and annotate PDFs, extract text with OCR, build photo collages, and convert or resize images — all on your device. See “Features & FAQ” for the full list.' },
    hi: { title: 'यह ऐप क्या करता है', body: 'Document Suite आपको दस्तावेज़ स्कैन करने, PDF संपादित व एनोटेट करने, OCR से टेक्स्ट निकालने, फ़ोटो कोलाज बनाने, और इमेज कन्वर्ट या रीसाइज़ करने देता है — सब आपके डिवाइस पर। पूरी सूची के लिए “Features & FAQ” देखें।' },
  },
  {
    en: { title: 'On-device processing', body: 'Scanning, editing, OCR, PDF generation and every other feature run entirely on your device. Your documents and images never leave your phone.' },
    hi: { title: 'डिवाइस पर प्रोसेसिंग', body: 'स्कैनिंग, एडिटिंग, OCR, PDF निर्माण और हर अन्य फ़ीचर पूरी तरह आपके डिवाइस पर चलते हैं। आपके दस्तावेज़ और इमेज कभी आपके फ़ोन से बाहर नहीं जाते।' },
  },
  {
    en: { title: 'No account, no tracking', body: 'The app has no sign-in, no analytics SDKs, no advertising and no third-party trackers. We do not collect, store or sell any personal data.' },
    hi: { title: 'कोई अकाउंट नहीं, कोई ट्रैकिंग नहीं', body: 'ऐप में कोई साइन-इन, कोई एनालिटिक्स SDK, कोई विज्ञापन और कोई तृतीय-पक्ष ट्रैकर नहीं है। हम कोई व्यक्तिगत डेटा एकत्र, संग्रहीत या बेचते नहीं हैं।' },
  },
  {
    en: { title: 'No internet required', body: 'Core functionality works fully offline. The only optional network actions are ones you trigger yourself — opening a share sheet, a support link, or checking Google Play for an app update.' },
    hi: { title: 'इंटरनेट की ज़रूरत नहीं', body: 'मुख्य कार्यक्षमता पूरी तरह ऑफ़लाइन काम करती है। एकमात्र वैकल्पिक नेटवर्क क्रियाएँ वे हैं जो आप स्वयं शुरू करते हैं — शेयर शीट खोलना, सपोर्ट लिंक, या ऐप अपडेट के लिए Google Play जाँचना।' },
  },
  {
    en: { title: 'Permissions', body: 'Camera is used only while you scan. The photo picker uses the system picker, so the app only sees the images you select. Files you save stay in the app’s private storage until you share or export them.' },
    hi: { title: 'अनुमतियाँ', body: 'कैमरा केवल स्कैन करते समय उपयोग होता है। फ़ोटो पिकर सिस्टम पिकर का उपयोग करता है, इसलिए ऐप केवल वही इमेज देखता है जो आप चुनते हैं। सहेजी फ़ाइलें तब तक ऐप के निजी स्टोरेज में रहती हैं जब तक आप उन्हें साझा या एक्सपोर्ट न करें।' },
  },
  {
    en: { title: 'Your data, your control', body: 'Documents are stored locally and can be deleted at any time from the Documents screen. Uninstalling the app removes everything it created.' },
    hi: { title: 'आपका डेटा, आपका नियंत्रण', body: 'दस्तावेज़ लोकल रूप से संग्रहीत होते हैं और Documents स्क्रीन से कभी भी हटाए जा सकते हैं। ऐप अनइंस्टॉल करने से उसके द्वारा बनाई गई हर चीज़ हट जाती है।' },
  },
  {
    en: { title: 'Contact', body: 'Questions about privacy? Reach out via the developer’s LinkedIn on the “About the developer” page.' },
    hi: { title: 'संपर्क', body: 'गोपनीयता के बारे में प्रश्न? “About the developer” पेज पर डेवलपर के LinkedIn के माध्यम से संपर्क करें।' },
  },
];

export function PrivacyScreen({ navigation }: RootScreenProps<'Privacy'>) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  return (
    <Screen scroll>
      <Header title={t('privacy.title')} onBack={() => navigation.goBack()} />
      <Text variant="caption" color="textTertiary" style={styles.updated}>
        {t('privacy.tagline')}
      </Text>
      {SECTIONS.map(s => (
        <View key={s.en.title} style={styles.section}>
          <Text variant="bodyStrong" style={styles.h}>{s[lang].title}</Text>
          <Text variant="callout" color="textSecondary" style={styles.body}>{s[lang].body}</Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  updated: { marginTop: 8, marginBottom: 16 },
  section: { marginBottom: 20 },
  h: { marginBottom: 6 },
  body: { lineHeight: 21 },
});
