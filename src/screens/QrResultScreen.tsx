import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { QrCode, Copy, Share2, ExternalLink, ScanLine, Lock, LockOpen } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import { formatLabel, openableUrl } from '../services/barcode';
import { isSecretQr, decryptSecret } from '../services/crypto/secretQr';
import { shareText } from '../services/sharing';
import { useTheme } from '../theme';
import { useT } from '../i18n';
import { haptics } from '../lib/haptics';
import type { RootScreenProps } from '../types/navigation';

/**
 * Shows a decoded QR/barcode. A Secret QR (encrypted payload) is locked until
 * the user enters the password; everything else is shown directly. Reached both
 * from the dedicated QR scanner and from the document scanner's QR branch.
 */
export function QrResultScreen({ route, navigation }: RootScreenProps<'QrResult'>) {
  const theme = useTheme();
  const t = useT();
  const toast = useToast();
  const { value, format } = route.params;
  const secret = isSecretQr(value);

  const [password, setPassword] = useState('');
  const [revealed, setRevealed] = useState<string | null>(null);
  const [error, setError] = useState(false);

  // What we actually act on: the plaintext once revealed, else the raw value.
  const shown = revealed ?? value;
  const locked = secret && revealed === null;
  const url = locked ? null : openableUrl(shown);

  const decrypt = () => {
    try {
      setRevealed(decryptSecret(value, password));
      setError(false);
      haptics.success();
    } catch {
      setError(true);
      haptics.warning();
    }
  };

  const copy = () => {
    Clipboard.setString(shown);
    haptics.success();
    toast({ variant: 'success', message: t('common.copied') });
  };

  const open = () => {
    if (!url) return;
    Linking.openURL(url).catch(() => toast({ variant: 'error', message: t('qr.openFail') }));
  };

  return (
    <Screen>
      <Header title={t('qr.title')} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.badge, { backgroundColor: theme.colors.brandSubtle, borderRadius: theme.radius.pill }]}>
          {locked ? <Lock size={28} color={theme.colors.brand} /> : secret ? <LockOpen size={28} color={theme.colors.brand} /> : <QrCode size={28} color={theme.colors.brand} />}
        </View>
        <Text variant="title" style={styles.center}>
          {locked ? t('qr.secretDetected') : secret ? t('qr.decrypted') : t('qr.detected')}
        </Text>
        <Text variant="caption" color="textSecondary" style={styles.center}>
          {locked ? t('qr.secretSub') : formatLabel(format)}
        </Text>

        {locked ? (
          <View style={styles.lockBox}>
            <TextInput
              value={password}
              onChangeText={txt => { setPassword(txt); setError(false); }}
              secureTextEntry
              autoFocus
              placeholder={t('qr.enterPassword')}
              placeholderTextColor={theme.colors.textTertiary}
              onSubmitEditing={decrypt}
              style={[styles.pwInput, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: error ? theme.colors.danger : theme.colors.border, borderRadius: theme.radius.md }]}
            />
            {error ? <Text variant="caption" color="danger" style={styles.err}>{t('qr.wrongPassword')}</Text> : null}
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.lg }]}>
            <Text variant="caption" color="textSecondary">{t('qr.content')}</Text>
            <Text variant="body" selectable style={styles.value}>{shown}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.actions}>
        {locked ? (
          <Button title={t('qr.decrypt')} icon={LockOpen} disabled={password.length === 0} onPress={decrypt} />
        ) : (
          <>
            {url ? <Button title={t('qr.open')} icon={ExternalLink} onPress={open} /> : null}
            <View style={styles.row}>
              <Button title={t('common.copy')} icon={Copy} variant="secondary" fullWidth={false} style={styles.flex1} onPress={copy} />
              <Button title={t('common.share')} icon={Share2} variant="secondary" fullWidth={false} style={[styles.flex1, styles.gap]} onPress={() => shareText(shown)} />
            </View>
          </>
        )}
        <Button title={t('qr.scanAgain')} icon={ScanLine} variant="ghost" onPress={() => navigation.replace('ScanQr')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', paddingTop: 24, gap: 8, flexGrow: 1 },
  badge: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  center: { textAlign: 'center' },
  card: { alignSelf: 'stretch', padding: 16, marginTop: 20, borderWidth: StyleSheet.hairlineWidth, gap: 6 },
  value: { lineHeight: 22 },
  lockBox: { alignSelf: 'stretch', marginTop: 20 },
  pwInput: { height: 52, paddingHorizontal: 14, fontSize: 16, borderWidth: StyleSheet.hairlineWidth },
  err: { marginTop: 8, marginLeft: 4 },
  actions: { gap: 12, paddingTop: 12 },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  gap: { marginLeft: 10 },
});
