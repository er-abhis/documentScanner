import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Copy, Share2, FileText } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { ocrImage, ocrPdf } from '../services/ocr';
import { buildTextPdf } from '../services/pdf/textPdf';
import { savePdfDocument } from '../services/storage';
import { shareText } from '../services/sharing';
import { ScanText } from 'lucide-react-native';
import { useTheme } from '../theme';
import { useI18n } from '../i18n';
import type { RootScreenProps } from '../types/navigation';

export function OcrScreen({ route, navigation }: RootScreenProps<'Ocr'>) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const toast = useToast();
  const { uri, name, kind } = route.params;

  const [status, setStatus] = useState<'running' | 'ready' | 'empty' | 'error'>('running');
  const [progress, setProgress] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    setStatus('running');
    try {
      let full: string;
      if (kind === 'pdf') {
        const pages = await ocrPdf(uri, (d, total) => setProgress(`${lang === 'hi' ? 'पेज' : 'Page'} ${d} / ${total}`));
        full = pages.join('\n\n');
      } else {
        full = await ocrImage(uri);
      }
      const trimmed = full.trim();
      setText(trimmed);
      setStatus(trimmed ? 'ready' : 'empty');
    } catch {
      setStatus('error');
    }
  }, [uri, kind, lang]);

  useEffect(() => { run(); }, [run]);

  const copy = () => {
    Clipboard.setString(text);
    toast({ variant: 'success', message: t('ocr.copiedMsg') });
  };

  const saveAsPdf = async () => {
    setBusy(true);
    try {
      const pdf = await buildTextPdf(text);
      await savePdfDocument(pdf, `${name.replace(/\.pdf$/i, '')} (text)`);
      navigation.reset({ index: 0, routes: [{ name: 'Tabs', state: { index: 1, routes: [{ name: 'Home' }, { name: 'Documents' }] } }] });
    } catch {
      setBusy(false);
      toast({ variant: 'error', message: t('ocr.tryAgain') });
    }
  };

  if (busy) return (<Screen center><LoadingState label={t('ocr.buildingPdf')} /></Screen>);

  if (status === 'running') {
    return (
      <Screen>
        <Header title={t('ocr.extract')} onBack={() => navigation.goBack()} />
        <View style={styles.center}><LoadingState label={`${t('ocr.readingText')}${progress ? ` ${progress}` : ''}`} /></View>
      </Screen>
    );
  }

  if (status !== 'ready') {
    return (
      <Screen>
        <Header title={t('ocr.extract')} onBack={() => navigation.goBack()} />
        <EmptyState
          icon={ScanText}
          title={status === 'empty' ? t('ocr.noText') : t('ocr.readFail')}
          subtitle={status === 'empty' ? t('ocr.noTextSub') : t('ocr.tryAgain')}
          actionLabel={t('common.retry')}
          onAction={run}
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.head}>
        <Header title={t('ocr.extract')} onBack={() => navigation.goBack()} />
        <Text variant="caption" color="textSecondary" style={styles.hint}>{t('ocr.hint')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.lg }]}
        />
      </ScrollView>

      <View style={[styles.bar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <Button title={t('common.copy')} icon={Copy} variant="secondary" fullWidth={false} style={styles.flex1} onPress={copy} />
        <Button title={t('common.share')} icon={Share2} variant="secondary" fullWidth={false} style={[styles.flex1, styles.gap]} onPress={() => shareText(text)} />
        <Button title={t('ocr.savePdf')} icon={FileText} fullWidth={false} style={[styles.flex1, styles.gap]} onPress={saveAsPdf} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 20 },
  hint: { marginLeft: 4, marginBottom: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16, flexGrow: 1 },
  input: { flex: 1, minHeight: 400, padding: 16, fontSize: 15, lineHeight: 22, textAlignVertical: 'top', borderWidth: StyleSheet.hairlineWidth },
  bar: { flexDirection: 'row', padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  flex1: { flex: 1 },
  gap: { marginLeft: 10 },
});
