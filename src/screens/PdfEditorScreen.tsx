import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Pen, Highlighter, Eraser, Undo2, Redo2, Eye, ChevronLeft, ChevronRight, Check,
  Type, Square, Circle, Minus, MoveUpRight,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { IconButton } from '../components/IconButton';
import { Slider } from '../components/Slider';
import { LoadingState } from '../components/LoadingState';
import { TextInputModal } from '../components/TextInputModal';
import { AnnotationCanvas, type CanvasTool } from '../components/annotate/AnnotationCanvas';
import { flattenAnnotations } from '../services/annotate/flatten';
import { PEN_COLORS, HIGHLIGHT_COLORS, type Annotation, type Pt } from '../services/annotate/types';
import { listDocuments, pageUris, saveDocument, generateDocumentPdf, type DocumentMeta } from '../services/storage';
import { HIT_SLOP, useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

const HISTORY_MAX = 50;
const SHAPE_TOOLS: { key: CanvasTool; icon: LucideIcon; label: string }[] = [
  { key: 'rect', icon: Square, label: 'Box' },
  { key: 'oval', icon: Circle, label: 'Circle' },
  { key: 'line', icon: Minus, label: 'Line' },
  { key: 'arrow', icon: MoveUpRight, label: 'Arrow' },
];

export function PdfEditorScreen({ route, navigation }: RootScreenProps<'PdfEditor'>) {
  const theme = useTheme();
  const params = route.params;
  const byId = 'id' in params;

  const [doc, setDoc] = useState<DocumentMeta | null>(null);
  const [uris, setUris] = useState<string[]>(byId ? [] : params.pages);
  const [loading, setLoading] = useState(byId);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);

  const [byPage, setByPage] = useState<Record<number, Annotation[]>>({});
  const past = useRef<Record<number, Annotation[][]>>({});
  const future = useRef<Record<number, Annotation[][]>>({});
  const [, force] = useState(0);
  const rerender = () => force(n => n + 1);

  const [tool, setTool] = useState<CanvasTool>('view');
  const [drawColor, setDrawColor] = useState(PEN_COLORS[0]);
  const [hiColor, setHiColor] = useState(HIGHLIGHT_COLORS[0]);
  const [penSize, setPenSize] = useState(6);
  const [hiSize, setHiSize] = useState(24);
  const [shapeSize, setShapeSize] = useState(6);
  const [textSize, setTextSize] = useState(40);
  const [eraseSize, setEraseSize] = useState(18);
  const [textModal, setTextModal] = useState<null | { mode: 'new'; pt: Pt } | { mode: 'edit'; id: string; initial: string }>(null);

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
      return () => { live = false; };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [byId, byId ? params.id : null]),
  );

  const docName = byId ? doc?.name ?? 'Document' : params.name;
  const anns = byPage[page] ?? [];
  const dirty = Object.values(byPage).some(a => a.length > 0) || Object.keys(past.current).length > 0;

  const setAnns = (next: Annotation[]) => {
    (past.current[page] ??= []).push(anns);
    if (past.current[page].length > HISTORY_MAX) past.current[page].shift();
    future.current[page] = [];
    setByPage(prev => ({ ...prev, [page]: next }));
  };

  const commit = (a: Annotation) => setAnns([...anns, a]);

  const eraseAt = (pt: Pt) => {
    for (let i = anns.length - 1; i >= 0; i--) {
      const a = anns[i];
      const r = eraseSize / 1000;
      let hit = false;
      if (a.kind === 'stroke') hit = a.points.some(p => Math.hypot(p.x - pt.x, p.y - pt.y) <= r + a.width);
      else if (a.kind === 'shape') {
        const minx = Math.min(a.a.x, a.b.x) - r, maxx = Math.max(a.a.x, a.b.x) + r;
        const miny = Math.min(a.a.y, a.b.y) - r, maxy = Math.max(a.a.y, a.b.y) + r;
        hit = pt.x >= minx && pt.x <= maxx && pt.y >= miny && pt.y <= maxy;
      } else hit = pt.x >= a.x - r && pt.x <= a.x + a.size * 6 && pt.y >= a.y - r && pt.y <= a.y + a.size * 1.5;
      if (hit) { setAnns(anns.filter((_, idx) => idx !== i)); return; }
    }
  };

  const undo = () => {
    const s = past.current[page];
    if (!s?.length) return;
    (future.current[page] ??= []).push(anns);
    setByPage(p => ({ ...p, [page]: s.pop()! }));
    rerender();
  };
  const redo = () => {
    const s = future.current[page];
    if (!s?.length) return;
    (past.current[page] ??= []).push(anns);
    setByPage(p => ({ ...p, [page]: s.pop()! }));
    rerender();
  };

  // text
  const placeText = (pt: Pt) => setTextModal({ mode: 'new', pt });
  const selectText = (id: string) => {
    const t = anns.find(a => a.id === id);
    if (t && t.kind === 'text') setTextModal({ mode: 'edit', id, initial: t.text });
  };
  const moveText = (id: string, pt: Pt) =>
    setByPage(prev => ({ ...prev, [page]: (prev[page] ?? []).map(a => (a.id === id && a.kind === 'text' ? { ...a, x: pt.x, y: pt.y } : a)) }));
  const submitText = (text: string) => {
    if (!textModal) return;
    if (textModal.mode === 'new') {
      commit({ id: `t${Date.now()}`, kind: 'text', text, x: textModal.pt.x, y: textModal.pt.y, size: textSize / 1000, color: drawColor, opacity: 1 });
    } else {
      setAnns(anns.map(a => (a.id === textModal.id && a.kind === 'text' ? { ...a, text } : a)));
    }
    setTextModal(null);
  };
  const deleteText = () => {
    if (textModal?.mode === 'edit') setAnns(anns.filter(a => a.id !== textModal.id));
    setTextModal(null);
  };

  const saveCopy = async () => {
    setSaving(true);
    try {
      const out: { uri: string }[] = [];
      for (let i = 0; i < uris.length; i++) {
        const a = byPage[i] ?? [];
        out.push({ uri: a.length ? await flattenAnnotations(uris[i], a) : uris[i] });
      }
      const meta = await saveDocument(out, `${docName} (edited)`);
      await generateDocumentPdf(meta.id);
      navigation.reset({ index: 0, routes: [{ name: 'Tabs', state: { index: 1, routes: [{ name: 'Home' }, { name: 'Documents' }] } }] });
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
    return (<Screen><Header title="Edit PDF" onBack={() => navigation.goBack()} /><View style={styles.center}><Text color="textSecondary">This document is unavailable.</Text></View></Screen>);
  }

  const editing = tool !== 'view';
  const isHi = tool === 'highlight';
  const isText = tool === 'text';
  const showColors = editing && tool !== 'erase';
  const color = isHi ? hiColor : drawColor;
  const setColor = isHi ? setHiColor : setDrawColor;
  const colors = isHi ? HIGHLIGHT_COLORS : PEN_COLORS;
  const size = isHi ? hiSize : tool === 'text' ? textSize : tool === 'erase' ? eraseSize : tool === 'pen' ? penSize : shapeSize;
  const setSize = isHi ? setHiSize : tool === 'text' ? setTextSize : tool === 'erase' ? setEraseSize : tool === 'pen' ? setPenSize : setShapeSize;
  const width = size / 1000;
  const opacity = isHi ? 0.4 : 1;

  return (
    <Screen padded={false}>
      <View style={styles.head}>
        <Header title={editing ? 'Edit PDF' : docName} onBack={back} right={<IconButton icon={Check} onPress={saveCopy} accessibilityLabel="Save copy" color={theme.colors.brand} />} />
      </View>

      <View style={[styles.canvas, { backgroundColor: theme.colors.surfaceSunken }]}>
        <AnnotationCanvas
          key={page}
          uri={uris[page]}
          annotations={anns}
          tool={tool}
          color={color}
          width={width}
          opacity={opacity}
          onCommit={commit}
          onErase={eraseAt}
          onTextPlace={placeText}
          onTextSelect={selectText}
          onTextMove={moveText}
        />
      </View>

      <View style={styles.pageNav}>
        <IconButton icon={ChevronLeft} onPress={() => setPage(p => Math.max(0, p - 1))} disabled={page <= 0} accessibilityLabel="Previous page" />
        <Text variant="callout" color="textSecondary">Page {page + 1} / {uris.length}{isText ? ' · tap to add text' : ''}</Text>
        <IconButton icon={ChevronRight} onPress={() => setPage(p => Math.min(uris.length - 1, p + 1))} disabled={page >= uris.length - 1} accessibilityLabel="Next page" />
      </View>

      <View style={[styles.bar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        {showColors && (
          <View style={styles.colors}>
            {colors.map(c => (
              <Pressable key={c} onPress={() => setColor(c)} hitSlop={HIT_SLOP} accessibilityLabel={`Color ${c}`}
                style={[styles.swatch, { backgroundColor: c, borderColor: color === c ? theme.colors.brand : theme.colors.border, borderWidth: color === c ? 3 : StyleSheet.hairlineWidth }]} />
            ))}
          </View>
        )}
        {editing && (
          <View style={styles.sliderWrap}>
            <Slider label={tool === 'erase' ? 'Eraser' : isText ? 'Text size' : 'Size'} value={size} min={tool === 'text' ? 16 : 2} max={tool === 'text' ? 96 : 40} onChange={v => setSize(Math.round(v))} format={v => `${Math.round(v)}`} />
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tools}>
          <ToolBtn active={tool === 'view'} icon={Eye} label="View" onPress={() => setTool('view')} />
          <ToolBtn active={isText} icon={Type} label="Text" onPress={() => setTool('text')} />
          <ToolBtn active={tool === 'pen'} icon={Pen} label="Pen" onPress={() => setTool('pen')} />
          <ToolBtn active={isHi} icon={Highlighter} label="Marker" onPress={() => setTool('highlight')} />
          {SHAPE_TOOLS.map(s => (
            <ToolBtn key={s.key} active={tool === s.key} icon={s.icon} label={s.label} onPress={() => setTool(s.key)} />
          ))}
          <ToolBtn active={tool === 'erase'} icon={Eraser} label="Erase" onPress={() => setTool('erase')} />
          <View style={styles.divider} />
          <ToolBtn active={false} icon={Undo2} label="Undo" onPress={undo} dim={!(past.current[page]?.length)} />
          <ToolBtn active={false} icon={Redo2} label="Redo" onPress={redo} dim={!(future.current[page]?.length)} />
        </ScrollView>
      </View>

      <TextInputModal
        visible={!!textModal}
        title={textModal?.mode === 'edit' ? 'Edit text' : 'Add text'}
        initial={textModal?.mode === 'edit' ? textModal.initial : ''}
        onSubmit={submitText}
        onDelete={textModal?.mode === 'edit' ? deleteText : undefined}
        onClose={() => setTextModal(null)}
      />
    </Screen>
  );
}

function ToolBtn({ active, icon: Icon, label, onPress, dim }: { active: boolean; icon: LucideIcon; label: string; onPress: () => void; dim?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.toolBtn, { backgroundColor: active ? theme.colors.brandSubtle : 'transparent', borderRadius: theme.radius.md, opacity: dim ? 0.35 : 1 }]}>
      <Icon size={20} color={active ? theme.colors.brand : theme.colors.textSecondary} />
      <Text variant="caption" color={active ? 'brand' : 'textSecondary'}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  canvas: { flex: 1, marginHorizontal: 12, marginTop: 8, borderRadius: 16, overflow: 'hidden' },
  pageNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 8 },
  bar: { paddingTop: 10, paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth },
  sliderWrap: { paddingHorizontal: 16 },
  colors: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  swatch: { width: 28, height: 28, borderRadius: 14 },
  tools: { paddingHorizontal: 12, gap: 4, alignItems: 'center' },
  toolBtn: { alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 12, paddingVertical: 8, minWidth: 54 },
  divider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: '#00000022', marginHorizontal: 6 },
});
