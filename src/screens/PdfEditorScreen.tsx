import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Pen, Highlighter, Eraser, Undo2, Redo2, Eye, ChevronLeft, ChevronRight, Check } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { IconButton } from '../components/IconButton';
import { Slider } from '../components/Slider';
import { LoadingState } from '../components/LoadingState';
import { AnnotationCanvas } from '../components/annotate/AnnotationCanvas';
import { flattenAnnotations } from '../services/annotate/flatten';
import { PEN_COLORS, HIGHLIGHT_COLORS, type Pt, type Stroke } from '../services/annotate/types';
import { listDocuments, pageUris, saveDocument, generateDocumentPdf, type DocumentMeta } from '../services/storage';
import { HIT_SLOP, useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

type Tool = 'view' | 'pen' | 'highlight' | 'erase';
const HISTORY_MAX = 40;

/**
 * Unified PDF editor for the app's own (image-page) documents. View mode reads
 * the pages; Edit mode draws pen/highlighter annotations per page. Save Copy
 * flattens annotations onto a NEW document + PDF, leaving the original intact.
 * (True native text-content editing is a separate paid-SDK track.)
 */
export function PdfEditorScreen({ route, navigation }: RootScreenProps<'PdfEditor'>) {
  const theme = useTheme();
  const params = route.params;
  const byId = 'id' in params;

  const [doc, setDoc] = useState<DocumentMeta | null>(null);
  const [uris, setUris] = useState<string[]>(byId ? [] : params.pages);
  const [loading, setLoading] = useState(byId);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);

  // per-page strokes + undo/redo
  const [strokesByPage, setStrokesByPage] = useState<Record<number, Stroke[]>>({});
  const past = useRef<Record<number, Stroke[][]>>({});
  const future = useRef<Record<number, Stroke[][]>>({});
  const [, force] = useState(0);
  const rerender = () => force(n => n + 1);

  const [tool, setTool] = useState<Tool>('view');
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [hiColor, setHiColor] = useState(HIGHLIGHT_COLORS[0]);
  const [penSize, setPenSize] = useState(6);
  const [hiSize, setHiSize] = useState(24);
  const [eraseSize, setEraseSize] = useState(18);

  useFocusEffect(
    useCallback(() => {
      if (!byId) return;
      let live = true;
      listDocuments().then(list => {
        if (!live) return;
        const m = list.find(d => d.id === params.id) ?? null;
        setDoc(m);
        setUris(m ? pageUris(m) : []);
        setLoading(false);
      });
      return () => {
        live = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [byId, byId ? params.id : null]),
  );

  const docName = byId ? doc?.name ?? 'Document' : params.name;

  const strokes = strokesByPage[page] ?? [];
  const dirty = Object.values(strokesByPage).some(s => s.length > 0) || Object.keys(past.current).length > 0;

  const setStrokes = (next: Stroke[]) => {
    (past.current[page] ??= []).push(strokes);
    if (past.current[page].length > HISTORY_MAX) past.current[page].shift();
    future.current[page] = [];
    setStrokesByPage(prev => ({ ...prev, [page]: next }));
  };

  const commit = (s: Stroke) => setStrokes([...strokes, s]);
  const erase = (pt: Pt) => {
    const r = eraseSize / 1000;
    for (let i = strokes.length - 1; i >= 0; i--) {
      if (strokes[i].points.some(p => Math.hypot(p.x - pt.x, p.y - pt.y) <= r)) {
        setStrokes(strokes.filter((_, idx) => idx !== i));
        return;
      }
    }
  };
  const undo = () => {
    const stack = past.current[page];
    if (!stack?.length) return;
    (future.current[page] ??= []).push(strokes);
    const prev = stack.pop()!;
    setStrokesByPage(p => ({ ...p, [page]: prev }));
    rerender();
  };
  const redo = () => {
    const stack = future.current[page];
    if (!stack?.length) return;
    (past.current[page] ??= []).push(strokes);
    const nxt = stack.pop()!;
    setStrokesByPage(p => ({ ...p, [page]: nxt }));
    rerender();
  };

  const saveCopy = async () => {
    setSaving(true);
    try {
      const outPages: { uri: string }[] = [];
      for (let i = 0; i < uris.length; i++) {
        const s = strokesByPage[i] ?? [];
        outPages.push({ uri: s.length ? await flattenAnnotations(uris[i], s) : uris[i] });
      }
      const meta = await saveDocument(outPages, `${docName} (edited)`);
      await generateDocumentPdf(meta.id);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Tabs', state: { index: 1, routes: [{ name: 'Home' }, { name: 'Documents' }] } }],
      });
    } catch {
      setSaving(false);
      Alert.alert('Couldn’t save', 'Please try again.');
    }
  };

  const back = () => {
    if (!dirty) return navigation.goBack();
    Alert.alert('Discard changes?', 'Your edits will be lost.', [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  if (loading) return (<Screen center><LoadingState /></Screen>);
  if (saving) return (<Screen center><LoadingState label="Saving a copy…" /></Screen>);
  if (uris.length === 0) {
    return (
      <Screen>
        <Header title="Edit PDF" onBack={() => navigation.goBack()} />
        <View style={styles.center}><Text color="textSecondary">This document is unavailable.</Text></View>
      </Screen>
    );
  }

  const editing = tool !== 'view';
  const color = tool === 'highlight' ? hiColor : penColor;
  const size = tool === 'pen' ? penSize : tool === 'highlight' ? hiSize : eraseSize;
  const setSize = tool === 'pen' ? setPenSize : tool === 'highlight' ? setHiSize : setEraseSize;
  const width = size / 1000;
  const opacity = tool === 'highlight' ? 0.4 : 1;
  const colors = tool === 'highlight' ? HIGHLIGHT_COLORS : PEN_COLORS;
  const setColor = tool === 'highlight' ? setHiColor : setPenColor;

  return (
    <Screen padded={false}>
      <View style={styles.head}>
        <Header
          title={editing ? 'Edit PDF' : docName}
          onBack={back}
          right={<IconButton icon={Check} onPress={saveCopy} accessibilityLabel="Save copy" color={theme.colors.brand} />}
        />
      </View>

      <View style={[styles.canvas, { backgroundColor: theme.colors.surfaceSunken }]}>
        <AnnotationCanvas
          key={page}
          uri={uris[page]}
          strokes={strokes}
          tool={tool}
          color={color}
          width={width}
          opacity={opacity}
          onCommit={commit}
          onErase={erase}
        />
      </View>

      {/* page nav */}
      <View style={styles.pageNav}>
        <IconButton icon={ChevronLeft} onPress={() => setPage(p => Math.max(0, p - 1))} disabled={page <= 0} accessibilityLabel="Previous page" />
        <Text variant="callout" color="textSecondary">
          Page {page + 1} / {uris.length}
        </Text>
        <IconButton icon={ChevronRight} onPress={() => setPage(p => Math.min(uris.length - 1, p + 1))} disabled={page >= uris.length - 1} accessibilityLabel="Next page" />
      </View>

      <View style={[styles.bar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <View style={styles.toolRow}>
          <View style={styles.tools}>
            <ToolBtn active={tool === 'view'} icon={Eye} label="View" onPress={() => setTool('view')} />
            <ToolBtn active={tool === 'pen'} icon={Pen} label="Pen" onPress={() => setTool('pen')} />
            <ToolBtn active={tool === 'highlight'} icon={Highlighter} label="Marker" onPress={() => setTool('highlight')} />
            <ToolBtn active={tool === 'erase'} icon={Eraser} label="Erase" onPress={() => setTool('erase')} />
          </View>
          <View style={styles.tools}>
            <IconButton icon={Undo2} onPress={undo} disabled={!(past.current[page]?.length)} accessibilityLabel="Undo" />
            <IconButton icon={Redo2} onPress={redo} disabled={!(future.current[page]?.length)} accessibilityLabel="Redo" />
          </View>
        </View>

        {editing && (
          <>
            {tool !== 'erase' && (
              <View style={styles.colors}>
                {colors.map(c => (
                  <Pressable
                    key={c}
                    onPress={() => setColor(c)}
                    hitSlop={HIT_SLOP}
                    accessibilityLabel={`Color ${c}`}
                    style={[styles.swatch, { backgroundColor: c, borderColor: color === c ? theme.colors.brand : theme.colors.border, borderWidth: color === c ? 3 : StyleSheet.hairlineWidth }]}
                  />
                ))}
              </View>
            )}
            <Slider label={tool === 'erase' ? 'Eraser size' : 'Size'} value={size} min={2} max={40} onChange={v => setSize(Math.round(v))} format={v => `${Math.round(v)}`} />
          </>
        )}
      </View>
    </Screen>
  );
}

function ToolBtn({ active, icon: Icon, label, onPress }: { active: boolean; icon: typeof Pen; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.toolBtn, { backgroundColor: active ? theme.colors.brandSubtle : theme.colors.surfaceAlt, borderRadius: theme.radius.md }]}>
      <Icon size={18} color={active ? theme.colors.brand : theme.colors.textSecondary} />
      <Text variant="caption" color={active ? 'brand' : 'textSecondary'}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  canvas: { flex: 1, marginHorizontal: 12, marginTop: 8, borderRadius: 16, overflow: 'hidden' },
  pageNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 8 },
  bar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, borderTopWidth: StyleSheet.hairlineWidth },
  toolRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolBtn: { alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 12, paddingVertical: 8, minWidth: 56 },
  colors: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 4, alignItems: 'center' },
  swatch: { width: 28, height: 28, borderRadius: 14 },
});
