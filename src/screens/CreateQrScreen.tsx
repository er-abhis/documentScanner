import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import QRCode from 'react-native-qrcode-svg';
import { QrCode, Lock, Save, Share2, Copy, RefreshCw, Sparkles } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import { saveQrImage, shareQrImage } from '../services/qr';
import { encryptSecret } from '../services/crypto/secretQr';
import { useTheme } from '../theme';
import { useT } from '../i18n';
import { haptics } from '../lib/haptics';
import type { RootScreenProps } from '../types/navigation';

const QR_SIZE = 230;
// QR byte capacity maxes at ~2331 bytes (version 40, ECC level M). Past that the
// underlying qrcode lib THROWS during render — which would crash the screen —
// so we refuse oversized input up front. 2000 leaves headroom for multi-byte
// UTF-8 (emoji count as 2-4 bytes each).
const MAX_QR_CHARS = 2000;

/**
 * Generate a QR from typed text. In `secret` mode the text is encrypted
 * (AES-256-GCM) with a password before encoding, so only someone with the
 * password can read it back through this app.
 */
export function CreateQrScreen({ route, navigation }: RootScreenProps<'CreateQr'>) {
  const theme = useTheme();
  const t = useT();
  const toast = useToast();
  const secret = route.params?.mode === 'secret';

  const [text, setText] = useState('');
  const [password, setPassword] = useState('');
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const svgRef = useRef<{ toDataURL: (cb: (b64: string) => void) => void } | null>(null);

  const canGenerate = text.trim().length > 0 && (!secret || password.length > 0);

  const generate = () => {
    if (!canGenerate) return;
    try {
      const value = secret ? encryptSecret(text.trim(), password) : text.trim();
      if (value.length > MAX_QR_CHARS) {
        toast({ variant: 'error', message: t('qr.tooLong') });
        return;
      }
      setQrValue(value);
      haptics.success();
    } catch {
      toast({ variant: 'error', message: t('qr.genFail') });
    }
  };

  const reset = () => {
    setQrValue(null);
    setText('');
    setPassword('');
  };

  const getBase64 = () =>
    new Promise<string>((resolve, reject) => {
      const ref = svgRef.current;
      if (!ref) return reject(new Error('no_ref'));
      // toDataURL is fire-and-forget; if the lib never calls back (unmount, GPU
      // hiccup) the Promise would hang and leave the button stuck in `busy`.
      // Time it out so save/share always resolve.
      const timer = setTimeout(() => reject(new Error('timeout')), 8000);
      ref.toDataURL((b64: string) => {
        clearTimeout(timer);
        b64 ? resolve(b64) : reject(new Error('empty'));
      });
    });

  const save = async () => {
    setBusy(true);
    try {
      await saveQrImage(await getBase64());
      toast({ variant: 'success', message: t('qr.saved') });
    } catch {
      toast({ variant: 'error', message: t('qr.saveFail') });
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    setBusy(true);
    try {
      await shareQrImage(await getBase64());
    } catch {
      toast({ variant: 'error', message: t('qr.shareFail') });
    } finally {
      setBusy(false);
    }
  };

  const copy = () => {
    Clipboard.setString(text);
    haptics.success();
    toast({ variant: 'success', message: t('common.copied') });
  };

  return (
    <Screen>
      <Header title={secret ? t('qr.secretTitle') : t('qr.createTitle')} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {qrValue ? (
          <>
            <View style={styles.qrCard}>
              <QRCode value={qrValue} size={QR_SIZE} getRef={c => (svgRef.current = c)} />
            </View>
            {secret ? (
              <View style={[styles.lockNote, { backgroundColor: theme.colors.brandSubtle, borderRadius: theme.radius.md }]}>
                <Lock size={15} color={theme.colors.brand} />
                <Text variant="caption" color="brand" style={styles.flex1}>{t('qr.secretGenerated')}</Text>
              </View>
            ) : null}
          </>
        ) : (
          <>
            <View style={[styles.hintRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md }]}>
              {secret ? <Lock size={18} color={theme.colors.brand} /> : <QrCode size={18} color={theme.colors.brand} />}
              <Text variant="caption" color="textSecondary" style={styles.flex1}>
                {secret ? t('qr.secretHint') : t('qr.createHint')}
              </Text>
            </View>

            <Text variant="caption" color="textSecondary" style={styles.label}>{t('qr.dataLabel')}</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              placeholder={t('qr.dataPlaceholder')}
              placeholderTextColor={theme.colors.textTertiary}
              style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md }]}
            />

            {secret ? (
              <>
                <Text variant="caption" color="textSecondary" style={styles.label}>{t('qr.password')}</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder={t('qr.passwordPlaceholder')}
                  placeholderTextColor={theme.colors.textTertiary}
                  style={[styles.pwInput, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md }]}
                />
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      <View style={styles.actions}>
        {qrValue ? (
          <>
            <View style={styles.row}>
              <Button title={t('common.save')} icon={Save} loading={busy} fullWidth={false} style={styles.flex1} onPress={save} />
              <Button title={t('common.share')} icon={Share2} variant="secondary" loading={busy} fullWidth={false} style={[styles.flex1, styles.gap]} onPress={share} />
            </View>
            <View style={styles.row}>
              <Button title={t('common.copy')} icon={Copy} variant="secondary" fullWidth={false} style={styles.flex1} onPress={copy} />
              <Button title={t('qr.newQr')} icon={RefreshCw} variant="ghost" fullWidth={false} style={[styles.flex1, styles.gap]} onPress={reset} />
            </View>
          </>
        ) : (
          <Button title={t('qr.generate')} icon={secret ? Lock : Sparkles} disabled={!canGenerate} onPress={generate} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingTop: 12, paddingBottom: 16, flexGrow: 1 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 18 },
  label: { marginBottom: 6, marginLeft: 2 },
  input: { minHeight: 120, padding: 14, fontSize: 16, lineHeight: 22, textAlignVertical: 'top', borderWidth: StyleSheet.hairlineWidth },
  pwInput: { height: 52, paddingHorizontal: 14, fontSize: 16, borderWidth: StyleSheet.hairlineWidth },
  qrCard: { alignSelf: 'center', backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, marginTop: 16, marginBottom: 16 },
  lockNote: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 10, maxWidth: QR_SIZE + 40 },
  actions: { gap: 10, paddingTop: 10 },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  gap: { marginLeft: 10 },
});
