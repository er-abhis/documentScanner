import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { WebView } from 'react-native-webview';

// react-native-webview's JSX types clash with React 19's; the runtime is fine.
const RNWebView = WebView as unknown as React.ComponentType<any>;
import RNFS from 'react-native-fs';
import { Check, ScanText, PencilLine } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { applyTextEdits, type PdfTextEdit } from '../services/pdf/textEdit';
import { savePdfDocument } from '../services/storage';
import { rasterizePdf } from '../services/pdf/raster';
import { PEN_COLORS } from '../services/annotate/types';
import { HIT_SLOP, useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

type SelMeta = {
  page: number; str: string; x: number; yTop: number; w: number;
  fontSize: number; fontName: string; pageW: number; pageH: number;
};

export function PdfTextEditorScreen({ route, navigation }: RootScreenProps<'PdfTextEditor'>) {
  const theme = useTheme();
  const { uri, name } = route.params;
  const webRef = useRef<any>(null);
  const b64 = useRef<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [scanned, setScanned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sel, setSel] = useState<{ meta: SelMeta; id: string } | null>(null);
  const [draft, setDraft] = useState('');
  const [color, setColor] = useState('#111111');
  const [edits, setEdits] = useState<(PdfTextEdit & { id: string })[]>([]);

  useEffect(() => {
    RNFS.readFile(uri.replace(/^file:\/\//, ''), 'base64')
      .then(d => (b64.current = d))
      .catch(() => Alert.alert('Couldn’t open', 'This PDF could not be read.'));
  }, [uri]);

  const post = (msg: object) => webRef.current?.postMessage(JSON.stringify(msg));

  const onMessage = useCallback((e: { nativeEvent: { data: string } }) => {
    let m: any;
    try { m = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (m.type === 'ready') {
      if (b64.current) post({ type: 'load', b64: b64.current });
    } else if (m.type === 'loaded') {
      setLoading(false);
      setScanned(!m.hasText);
    } else if (m.type === 'select') {
      setSel({ meta: m.meta, id: m.id });
      setDraft(m.meta.str);
      setColor('#111111');
    } else if (m.type === 'error') {
      setLoading(false);
      Alert.alert('Couldn’t render', m.message ?? 'Unknown error');
    }
  }, []);

  const recordEdit = (newText: string | null) => {
    if (!sel) return;
    const { meta, id } = sel;
    const edit: PdfTextEdit & { id: string } = {
      id, page: meta.page, orig: meta.str, x: meta.x, yTop: meta.yTop, w: meta.w,
      fontSize: meta.fontSize, fontName: meta.fontName, newText, color,
    };
    setEdits(prev => [...prev.filter(x => x.id !== id), edit]);
    post({ type: 'edited', id, deleted: newText === null, text: newText });
    setSel(null);
  };

  const save = async () => {
    if (edits.length === 0) {
      Alert.alert('No changes', 'Select text to replace or delete first.');
      return;
    }
    setSaving(true);
    try {
      const out = await applyTextEdits(uri, edits);
      await savePdfDocument(out, `${name.replace(/\.pdf$/i, '')} (edited)`);
      navigation.reset({ index: 0, routes: [{ name: 'Tabs', state: { index: 1, routes: [{ name: 'Home' }, { name: 'Documents' }] } }] });
    } catch {
      setSaving(false);
      Alert.alert('Couldn’t save', 'Please try again.');
    }
  };

  const annotateInstead = async () => {
    setSaving(true);
    try {
      const pages = await rasterizePdf(uri);
      setSaving(false);
      if (pages.length) navigation.replace('PdfEditor', { pages, name });
    } catch {
      setSaving(false);
      Alert.alert('Couldn’t open', 'Please try again.');
    }
  };

  if (saving) return (<Screen center><LoadingState label="Working…" /></Screen>);

  return (
    <Screen padded={false}>
      <View style={styles.head}>
        <Header
          title={name}
          onBack={() => navigation.goBack()}
          right={<Pressable onPress={save} hitSlop={HIT_SLOP} accessibilityLabel="Save copy"><Check size={theme.iconSize.md} color={theme.colors.brand} /></Pressable>}
        />
        <Text variant="caption" color="textSecondary" style={styles.hint}>
          {scanned ? 'Scanned PDF' : `Tap any text to replace or delete${edits.length ? ` · ${edits.length} edit${edits.length === 1 ? '' : 's'}` : ''}`}
        </Text>
      </View>

      <View style={styles.body}>
        <RNWebView
          ref={webRef}
          source={{ uri: 'file:///android_asset/pdfjs/editor.html' }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
          allowFileAccessFromFileURLs
          allowUniversalAccessFromFileURLs
          onMessage={onMessage}
          style={{ backgroundColor: theme.colors.surfaceSunken }}
        />
        {loading && !scanned && (
          <View style={styles.overlay}><LoadingState label="Opening PDF…" /></View>
        )}
        {scanned && (
          <View style={[styles.overlay, { backgroundColor: theme.colors.background }]}>
            <EmptyState
              icon={ScanText}
              title="This is a scanned PDF"
              subtitle="It has no selectable text. Extract its text with on-device OCR, or annotate it."
              actionLabel="Extract text (OCR)"
              actionIcon={ScanText}
              onAction={() => navigation.replace('Ocr', { uri, name, kind: 'pdf' })}
            />
            <View style={styles.scanAlt}>
              <Button title="Annotate instead" icon={PencilLine} variant="secondary" onPress={annotateInstead} />
            </View>
          </View>
        )}
      </View>

      {/* selection edit sheet */}
      <Modal visible={!!sel} transparent animationType="slide" onRequestClose={() => setSel(null)}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={() => setSel(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
            <Text variant="title" style={styles.sheetTitle}>Edit text</Text>
            {sel && (
              <Text variant="caption" color="textSecondary" style={styles.detected}>
                Detected · {cleanFont(sel.meta.fontName)} · {Math.round(sel.meta.fontSize)} pt
              </Text>
            )}
            <TextInput
              value={draft}
              onChangeText={setDraft}
              autoFocus
              multiline
              style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md }]}
            />
            <View style={styles.swatches}>
              {PEN_COLORS.map(c => (
                <Pressable key={c} onPress={() => setColor(c)} hitSlop={HIT_SLOP}
                  style={[styles.swatch, { backgroundColor: c, borderColor: color === c ? theme.colors.brand : theme.colors.border, borderWidth: color === c ? 3 : StyleSheet.hairlineWidth }]} />
              ))}
            </View>
            <Text variant="caption" color="textTertiary" style={styles.note}>
              Replaces the original text in place when the PDF allows it; otherwise overlays a close match at the same position.
            </Text>
            <View style={styles.actions}>
              <Button title="Delete" variant="danger" fullWidth={false} style={styles.flex1} onPress={() => recordEdit(null)} />
              <Button title="Replace" fullWidth={false} style={[styles.flex1, styles.gap]} onPress={() => recordEdit(draft.trim())} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function cleanFont(name: string) {
  if (!name || /^g_|^[a-z]\d/i.test(name)) return 'Embedded font';
  return name.replace(/[-_].*$/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 20 },
  hint: { marginLeft: 4, marginBottom: 6 },
  body: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  scanAlt: { paddingHorizontal: 40, width: '100%', marginTop: -8 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetTitle: { marginBottom: 4 },
  detected: { marginBottom: 12 },
  input: { minHeight: 64, padding: 14, fontSize: 16, textAlignVertical: 'top' },
  swatches: { flexDirection: 'row', gap: 10, marginTop: 14 },
  swatch: { width: 28, height: 28, borderRadius: 14 },
  note: { marginTop: 14 },
  actions: { flexDirection: 'row', marginTop: 16 },
  flex1: { flex: 1 },
  gap: { marginLeft: 12 },
});
