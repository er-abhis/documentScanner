import { useState } from 'react';
import { Alert, Image, Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Clipboard from '@react-native-clipboard/clipboard';
import { Coffee, Rocket, ShieldCheck, Heart, Copy, Check } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { useTheme } from '../theme';
import { useT } from '../i18n';
import { haptics } from '../lib/haptics';
import type { RootScreenProps } from '../types/navigation';

const UPI_ID = 'royal.4766@ybl';

const PAYPAL_TIERS = [
  { emoji: '☕', label: 'Buy a coffee', amount: '$5', url: 'https://paypal.me/tinytalkerdev/5' },
  { emoji: '🍰', label: 'Support the work', amount: '$25', url: 'https://paypal.me/tinytalkerdev/25' },
  { emoji: '🚀', label: 'Power a feature', amount: '$50', url: 'https://paypal.me/tinytalkerdev/50' },
];

export function CoffeeScreen({ navigation }: RootScreenProps<'Coffee'>) {
  const theme = useTheme();
  const t = useT();
  const [tab, setTab] = useState<'paypal' | 'upi'>('upi');
  const [copied, setCopied] = useState(false);

  const reasons: { icon: LucideIcon; title: string; sub: string }[] = [
    { icon: Rocket, title: t('coffee.reason1Title'), sub: t('coffee.reason1Sub') },
    { icon: ShieldCheck, title: t('coffee.reason2Title'), sub: t('coffee.reason2Sub') },
    { icon: Heart, title: t('coffee.reason3Title'), sub: t('coffee.reason3Sub') },
  ];

  const open = (url: string) => Linking.openURL(url).catch(() => Alert.alert('Couldn’t open link', url));

  const copyUpi = () => {
    Clipboard.setString(UPI_ID);
    haptics.success();
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <Screen scroll padded={false}>
      <View style={styles.pad}>
        <Header title={t('coffee.title')} onBack={() => navigation.goBack()} />
      </View>

      {/* glossy hero */}
      <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.pad}>
        <LinearGradient
          colors={theme.colors.brandGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { borderRadius: theme.radius.xl }, theme.elevation(3)]}
        >
          <LinearGradient
            colors={['#FFFFFF44', '#FFFFFF00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.gloss}
          />
          <View style={styles.heroBadge}>
            <Coffee size={30} color={theme.colors.onBrand} />
          </View>
          <Text variant="h2" style={{ color: theme.colors.onBrand }}>
            {t('coffee.heroTitle')}
          </Text>
          <Text variant="callout" style={[styles.heroSub, { color: theme.colors.onBrand }]}>
            {t('coffee.heroSub')}
          </Text>
        </LinearGradient>
      </Animated.View>

      {/* reasons */}
      <View style={[styles.pad, styles.reasons]}>
        {reasons.map((r, i) => (
          <Animated.View key={r.title} entering={FadeInDown.delay(80 + i * 60).springify().damping(18)}>
            <View style={[styles.reason, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderColor: theme.colors.border, borderWidth: theme.mode === 'dark' ? StyleSheet.hairlineWidth : 0 }, theme.elevation(1)]}>
              <View style={[styles.reasonIcon, { backgroundColor: theme.colors.brandSubtle, borderRadius: theme.radius.md }]}>
                <r.icon size={20} color={theme.colors.brand} />
              </View>
              <View style={styles.flex}>
                <Text variant="bodyStrong">{r.title}</Text>
                <Text variant="caption" color="textSecondary">{r.sub}</Text>
              </View>
            </View>
          </Animated.View>
        ))}
      </View>

      {/* method tabs */}
      <View style={styles.pad}>
        <Text variant="title" style={styles.choose}>{t('coffee.choose')}</Text>
        <View style={[styles.tabs, { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md }]}>
          {(['upi', 'paypal'] as const).map(k => {
            const active = tab === k;
            return (
              <Pressable
                key={k}
                onPress={() => { haptics.light(); setTab(k); }}
                style={[styles.tab, { borderRadius: theme.radius.sm }, active && { backgroundColor: theme.colors.surface, ...theme.elevation(1) }]}
              >
                <Text variant="callout" color={active ? 'brand' : 'textSecondary'}>
                  {k === 'upi' ? t('coffee.upi') : t('coffee.paypal')}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'upi' ? (
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderColor: theme.colors.border, borderWidth: theme.mode === 'dark' ? StyleSheet.hairlineWidth : 0 }, theme.elevation(1)]}>
            <View style={styles.qrCard}>
              <Image source={require('../assets/upi.png')} style={styles.qr} resizeMode="contain" />
            </View>
            <Text variant="bodyStrong" style={styles.center}>{t('coffee.scanToPay')}</Text>
            <View style={styles.appRow}>
              {['GPay', 'PhonePe', 'Paytm'].map(a => (
                <View key={a} style={[styles.appBadge, { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.pill }]}>
                  <Text variant="caption" color="textSecondary">{a}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.upiRow, { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md }]}>
              <View style={styles.flex}>
                <Text variant="caption" color="textSecondary">{t('coffee.upiId')}</Text>
                <Text variant="bodyStrong">{UPI_ID}</Text>
              </View>
              <Button
                title={copied ? t('common.copied') : t('common.copy')}
                icon={copied ? Check : Copy}
                variant={copied ? 'secondary' : 'primary'}
                fullWidth={false}
                onPress={copyUpi}
              />
            </View>
          </View>
        ) : (
          <View style={styles.tiers}>
            {PAYPAL_TIERS.map(tier => (
              <Pressable
                key={tier.url}
                onPress={() => { haptics.light(); open(tier.url); }}
                style={[styles.tier, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderColor: theme.colors.border, borderWidth: theme.mode === 'dark' ? StyleSheet.hairlineWidth : 0 }, theme.elevation(1)]}
              >
                <Text variant="h2">{tier.emoji}</Text>
                <View style={styles.flex}>
                  <Text variant="bodyStrong">{tier.label}</Text>
                  <Text variant="caption" color="textSecondary">via PayPal</Text>
                </View>
                <View style={[styles.amount, { backgroundColor: theme.colors.brandSubtle, borderRadius: theme.radius.pill }]}>
                  <Text variant="label" color="brand">{tier.amount}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <Text variant="caption" color="textTertiary" style={styles.disclaimer}>
          {t('coffee.disclaimer')}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 20 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  hero: { alignItems: 'center', gap: 8, padding: 26, marginTop: 8, overflow: 'hidden' },
  gloss: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%' },
  heroBadge: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#FFFFFF2A', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroSub: { textAlign: 'center', opacity: 0.92, marginTop: 4, maxWidth: 300 },
  reasons: { marginTop: 20, gap: 12 },
  reason: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  reasonIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  choose: { marginTop: 24, marginBottom: 12 },
  tabs: { flexDirection: 'row', padding: 4, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  card: { padding: 18, alignItems: 'center', gap: 14 },
  qrCard: { padding: 14, backgroundColor: '#FFFFFF', borderRadius: 16 },
  qr: { width: 190, height: 190 },
  appRow: { flexDirection: 'row', gap: 8 },
  appBadge: { paddingHorizontal: 12, paddingVertical: 5 },
  upiRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, alignSelf: 'stretch' },
  tiers: { gap: 10 },
  tier: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  amount: { paddingHorizontal: 14, paddingVertical: 6 },
  disclaimer: { textAlign: 'center', marginTop: 20, marginBottom: 12 },
});
