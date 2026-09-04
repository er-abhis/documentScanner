import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
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
import { useToast } from '../components/Toast';
import { applyTextEdits, type PdfTextEdit } from '../services/pdf/textEdit';
import { savePdfDocument } from '../services/storage';
import { rasterizePdf } from '../services/pdf/raster';
import { PEN_COLORS } from '../services/annotate/types';
import { useDeferredMount } from '../hooks/useDeferredMount';
import { useT } from '../i18n';
import { HIT_SLOP, useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

type SelMeta = {
  page: number; str: string; x: number; yTop: number; w: number;
  fontSize: number; fontName: string; pageW: number; pageH: number;
};

export function PdfTextEditorScreen({ route, navigation }: RootScreenProps<'PdfTextEditor'>) {
  const theme = useTheme();
  const t = useT();
  const toast = useToast();
  // Mount the pdf.js WebView only after the push animation completes.
  const ready = useDeferredMount();
  const { uri, name } = route.params;
  const webRef = useRef<any>(null);

  const [b64Data, setB64Data] = useState<string | null>(null);
  const [webViewReady, setWebViewReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scanned, setScanned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sel, setSel] = useState<{ meta: SelMeta; id: string } | null>(null);
  const [draft, setDraft] = useState('');
  const [color, setColor] = useState('#111111');
  const [edits, setEdits] = useState<(PdfTextEdit & { id: string })[]>([]);

  useEffect(() => {
    RNFS.readFile(uri.replace(/^file:\/\//, ''), 'base64')
      .then(d => setB64Data(d))
      .catch(() => toast({ variant: 'error', message: t('pdfTextEditor.openFailMsg') }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  const post = (msg: object) => webRef.current?.postMessage(JSON.stringify(msg));

  useEffect(() => {
    if (b64Data && webViewReady) {
      post({ type: 'load', b64: b64Data });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b64Data, webViewReady]);

  const onMessage = useCallback((e: { nativeEvent: { data: string } }) => {
    let m: any;
    try { m = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (m.type === 'ready') {
      setWebViewReady(true);
    } else if (m.type === 'loaded') {
      setLoading(false);
      setScanned(!m.hasText);
    } else if (m.type === 'select') {
      if (!m.meta || typeof m.meta !== 'object') return;
      setSel({ meta: m.meta, id: m.id });
      setDraft(typeof m.meta.str === 'string' ? m.meta.str : '');
      setColor('#111111');
    } else if (m.type === 'error') {
      setLoading(false);
      toast({ variant: 'error', message: m.message ?? t('pdfTextEditor.unknownError') });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      toast({ variant: 'info', message: t('pdfTextEditor.noChangesMsg') });
      return;
    }
    setSaving(true);
    try {
      const out = await applyTextEdits(uri, edits);
      await savePdfDocument(out, `${name.replace(/\.pdf$/i, '')} (edited)`);
      navigation.reset({ index: 0, routes: [{ name: 'Tabs', state: { index: 1, routes: [{ name: 'Home' }, { name: 'Documents' }] } }] });
    } catch {
      setSaving(false);
      toast({ variant: 'error', message: t('pdfTextEditor.tryAgain') });
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
      toast({ variant: 'error', message: t('pdfTextEditor.tryAgain') });
    }
  };

  if (saving) return (<Screen center><LoadingState label={t('pdfTextEditor.working')} /></Screen>);

  return (
    <Screen padded={false}>
      <View style={styles.head}>
        <Header
          title={name}
          onBack={() => navigation.goBack()}
          right={<Pressable onPress={save} hitSlop={HIT_SLOP} accessibilityLabel={t('pdfTextEditor.saveCopy')}><Check size={theme.iconSize.md} color={theme.colors.brand} /></Pressable>}
        />
        <Text variant="caption" color="textSecondary" style={styles.hint}>
          {scanned
            ? t('pdfTextEditor.scannedPdf')
            : `${t('pdfTextEditor.tapToEdit')}${edits.length ? ` · ${edits.length} ${edits.length === 1 ? t('pdfTextEditor.edit') : t('pdfTextEditor.edits')}` : ''}`}
        </Text>
      </View>

      <View style={styles.body}>
        {ready && (
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
        )}
        {(!ready || (loading && !scanned)) && (
          <View style={styles.overlay}><LoadingState label={t('pdfPreview.opening')} /></View>
        )}
        {scanned && (
          <View style={[styles.overlay, { backgroundColor: theme.colors.background }]}>
            <EmptyState
              icon={ScanText}
              title={t('pdfTextEditor.scannedTitle')}
              subtitle={t('pdfTextEditor.scannedSub')}
              actionLabel={t('pdfTextEditor.extractOcr')}
              actionIcon={ScanText}
              onAction={() => navigation.replace('Ocr', { uri, name, kind: 'pdf' })}
            />
            <View style={styles.scanAlt}>
              <Button title={t('pdfTextEditor.annotateInstead')} icon={PencilLine} variant="secondary" onPress={annotateInstead} />
            </View>
          </View>
        )}
      </View>

      {/* selection edit sheet */}
      <Modal visible={!!sel} transparent animationType="slide" onRequestClose={() => setSel(null)}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={() => setSel(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
            <Text variant="title" style={styles.sheetTitle}>{t('pdfTextEditor.editText')}</Text>
            {sel && (
              <Text variant="caption" color="textSecondary" style={styles.detected}>
                {t('pdfTextEditor.detected')} · {cleanFont(sel.meta.fontName, t('pdfTextEditor.embeddedFont'))} · {Math.round(sel.meta.fontSize)} {t('pdfTextEditor.pt')}
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
              {t('pdfTextEditor.note')}
            </Text>
            <View style={styles.actions}>
              <Button title={t('pdfTextEditor.delete')} variant="danger" fullWidth={false} style={styles.flex1} onPress={() => recordEdit(null)} />
              <Button title={t('pdfTextEditor.replace')} fullWidth={false} style={[styles.flex1, styles.gap]} onPress={() => recordEdit(draft.trim())} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function cleanFont(name: string, embeddedLabel: string) {
  if (!name || /^g_|^[a-z]\d/i.test(name)) return embeddedLabel;
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
