import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { ExternalLink, Coffee, Sparkles, Smartphone, ShieldCheck, Rocket } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { useTheme } from '../theme';
import { useI18n } from '../i18n';
import { haptics } from '../lib/haptics';
import type { RootScreenProps } from '../types/navigation';

const LINKEDIN = 'https://www.linkedin.com/in/er-abhishek-choudhary/';

const HIGHLIGHTS: { icon: LucideIcon; en: string; hi: string }[] = [
  { icon: Rocket, en: '8+ years building production mobile & web applications.', hi: '8+ वर्षों का प्रोडक्शन मोबाइल और वेब ऐप्लिकेशन बनाने का अनुभव।' },
  { icon: Smartphone, en: 'React Native, Android & iOS — with a focus on New Architecture.', hi: 'React Native, Android और iOS — New Architecture पर विशेष ध्यान।' },
  { icon: ShieldCheck, en: 'Offline-first, privacy-focused products that work without the cloud.', hi: 'ऑफ़लाइन-फर्स्ट, गोपनीयता-केंद्रित प्रोडक्ट जो बिना क्लाउड के काम करते हैं।' },
  { icon: Sparkles, en: 'Full-stack: TypeScript, Node.js, native modules and polished UX.', hi: 'फुल-स्टैक: TypeScript, Node.js, नेटिव मॉड्यूल और बेहतरीन UX।' },
];

const SKILLS = ['React Native', 'TypeScript', 'Android', 'iOS', 'Node.js', 'Skia', 'PDF', 'UI/UX'];

export function AboutScreen({ navigation }: RootScreenProps<'About'>) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const openLinkedIn = () => {
    haptics.light();
    Linking.openURL(LINKEDIN).catch(() => Alert.alert('Couldn’t open link', LINKEDIN));
  };

  return (
    <Screen scroll padded={false}>
      <View style={styles.pad}>
        <Header title={t('about.title')} onBack={() => navigation.goBack()} />
      </View>

      <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.pad}>
        <LinearGradient
          colors={theme.colors.brandGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { borderRadius: theme.radius.xl }, theme.elevation(3)]}
        >
          <LinearGradient colors={['#FFFFFF44', '#FFFFFF00']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.gloss} />
          <View style={styles.avatar}>
            <Text variant="display" style={{ color: theme.colors.onBrand }}>AC</Text>
          </View>
          <Text variant="h2" style={{ color: theme.colors.onBrand }}>Abhishek Choudhary</Text>
          <Text variant="callout" style={[styles.role, { color: theme.colors.onBrand }]}>{t('about.role')}</Text>
        </LinearGradient>
      </Animated.View>

      <View style={[styles.pad, styles.skills]}>
        {SKILLS.map(s => (
          <View key={s} style={[styles.skill, { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.pill }]}>
            <Text variant="caption" color="textSecondary">{s}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.pad, styles.list]}>
        {HIGHLIGHTS.map((h, i) => (
          <Animated.View key={h.en} entering={FadeInDown.delay(60 + i * 60).springify().damping(18)}>
            <View style={[styles.row, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderColor: theme.colors.border, borderWidth: theme.mode === 'dark' ? StyleSheet.hairlineWidth : 0 }, theme.elevation(1)]}>
              <View style={[styles.rowIcon, { backgroundColor: theme.colors.brandSubtle, borderRadius: theme.radius.md }]}>
                <h.icon size={18} color={theme.colors.brand} />
              </View>
              <Text variant="callout" style={styles.flex}>{h[lang]}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      <View style={[styles.pad, styles.actions]}>
        <Button title={t('about.linkedin')} icon={ExternalLink} onPress={openLinkedIn} />
        <Button title={t('about.coffee')} icon={Coffee} variant="secondary" style={styles.gap} onPress={() => navigation.navigate('Coffee')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 20 },
  flex: { flex: 1 },
  hero: { alignItems: 'center', gap: 6, padding: 28, marginTop: 8, overflow: 'hidden' },
  gloss: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%' },
  avatar: { width: 76, height: 76, borderRadius: 26, backgroundColor: '#FFFFFF2A', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  role: { opacity: 0.92, marginTop: 2 },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  skill: { paddingHorizontal: 12, paddingVertical: 6 },
  list: { marginTop: 18, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  rowIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  actions: { marginTop: 22 },
  gap: { marginTop: 12 },
});
