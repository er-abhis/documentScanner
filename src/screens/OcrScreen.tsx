import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Copy, Share2, FileText } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { ocrImage, ocrPdf } from '../services/ocr';
import { buildTextPdf } from '../services/pdf/textPdf';
import { savePdfDocument } from '../services/storage';
import { shareText } from '../services/sharing';
import { ScanText } from 'lucide-react-native';
import { useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

export function OcrScreen({ route, navigation }: RootScreenProps<'Ocr'>) {
  const theme = useTheme();
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
        const pages = await ocrPdf(uri, (d, t) => setProgress(`Page ${d} / ${t}`));
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
  }, [uri, kind]);

  useEffect(() => { run(); }, [run]);

  const copy = () => {
    Clipboard.setString(text);
    Alert.alert('Copied', 'Text copied to clipboard.');
  };

  const saveAsPdf = async () => {
    setBusy(true);
    try {
      const pdf = await buildTextPdf(text);
      await savePdfDocument(pdf, `${name.replace(/\.pdf$/i, '')} (text)`);
      navigation.reset({ index: 0, routes: [{ name: 'Tabs', state: { index: 1, routes: [{ name: 'Home' }, { name: 'Documents' }] } }] });
    } catch {
      setBusy(false);
      Alert.alert('Couldn’t save', 'Please try again.');
    }
  };

  if (busy) return (<Screen center><LoadingState label="Building PDF…" /></Screen>);

  if (status === 'running') {
    return (
      <Screen>
        <Header title="Extract text" onBack={() => navigation.goBack()} />
        <View style={styles.center}><LoadingState label={`Reading text…${progress ? ` ${progress}` : ''}`} /></View>
      </Screen>
    );
  }

  if (status !== 'ready') {
    return (
      <Screen>
        <Header title="Extract text" onBack={() => navigation.goBack()} />
        <EmptyState
          icon={ScanText}
          title={status === 'empty' ? 'No text found' : 'Couldn’t read text'}
          subtitle={status === 'empty' ? 'This document doesn’t appear to contain readable text.' : 'Please try again.'}
          actionLabel="Retry"
          onAction={run}
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.head}>
        <Header title="Extract text" onBack={() => navigation.goBack()} />
        <Text variant="caption" color="textSecondary" style={styles.hint}>Recognized on-device · edit before exporting</Text>
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
        <Button title="Copy" icon={Copy} variant="secondary" fullWidth={false} style={styles.flex1} onPress={copy} />
        <Button title="Share" icon={Share2} variant="secondary" fullWidth={false} style={[styles.flex1, styles.gap]} onPress={() => shareText(text)} />
        <Button title="Save PDF" icon={FileText} fullWidth={false} style={[styles.flex1, styles.gap]} onPress={saveAsPdf} />
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
