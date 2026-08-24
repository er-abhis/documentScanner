import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Pen, Highlighter, Eraser, Undo2, Redo2, Check } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { IconButton } from '../components/IconButton';
import { Slider } from '../components/Slider';
import { LoadingState } from '../components/LoadingState';
import { AnnotationCanvas } from '../components/annotate/AnnotationCanvas';
import { flattenAnnotations } from '../services/annotate/flatten';
import {
  PEN_COLORS,
  HIGHLIGHT_COLORS,
  type Pt,
  type Stroke,
} from '../services/annotate/types';
import { HIT_SLOP, useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

type Tool = 'pen' | 'highlight' | 'erase';
const HISTORY_MAX = 40;

export function AnnotateScreen({ route, navigation }: RootScreenProps<'Annotate'>) {
  const theme = useTheme();
  const { uri, onDone } = route.params;

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const past = useRef<Stroke[][]>([]);
  const future = useRef<Stroke[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [tool, setTool] = useState<Tool>('pen');
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [hiColor, setHiColor] = useState(HIGHLIGHT_COLORS[0]);
  const [penSize, setPenSize] = useState(6);
  const [hiSize, setHiSize] = useState(24);
  const [eraseSize, setEraseSize] = useState(18);
  const [penOpacity, setPenOpacity] = useState(1);
  const [hiOpacity, setHiOpacity] = useState(0.4);
  const [saving, setSaving] = useState(false);

  const syncFlags = () => {
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
  };

  const mutate = (next: Stroke[]) => {
    past.current.push(strokes);
    if (past.current.length > HISTORY_MAX) past.current.shift();
    future.current = [];
    setStrokes(next);
    syncFlags();
  };

  const commit = (s: Stroke) => mutate([...strokes, s]);

  const erase = (pt: Pt) => {
    const r = eraseSize / 1000; // radius in normalized units
    // remove the topmost stroke passing within r of the touch point
    for (let i = strokes.length - 1; i >= 0; i--) {
      const hit = strokes[i].points.some(p => Math.hypot(p.x - pt.x, p.y - pt.y) <= r);
      if (hit) {
        mutate(strokes.filter((_, idx) => idx !== i));
        return;
      }
    }
  };

  const undo = () => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(strokes);
    setStrokes(prev);
    syncFlags();
  };
  const redo = () => {
    const nxt = future.current.pop();
    if (!nxt) return;
    past.current.push(strokes);
    setStrokes(nxt);
    syncFlags();
  };

  const save = async () => {
    if (strokes.length === 0) {
      navigation.goBack();
      return;
    }
    setSaving(true);
    try {
      const out = await flattenAnnotations(uri, strokes);
      onDone(out);
      navigation.goBack();
    } catch {
      setSaving(false);
      Alert.alert('Couldn’t save', 'Please try again.');
    }
  };

  const back = () => {
    if (strokes.length === 0 && past.current.length === 0) return navigation.goBack();
    Alert.alert('Discard drawing?', 'Your annotations will be lost.', [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  if (saving) {
    return (
      <Screen center>
        <LoadingState label="Saving…" />
      </Screen>
    );
  }

  const color = tool === 'pen' ? penColor : hiColor;
  const width =
    (tool === 'pen' ? penSize : tool === 'highlight' ? hiSize : eraseSize) / 1000;
  const opacity = tool === 'pen' ? penOpacity : tool === 'highlight' ? hiOpacity : 1;
  const colors = tool === 'highlight' ? HIGHLIGHT_COLORS : PEN_COLORS;
  const setColor = tool === 'highlight' ? setHiColor : setPenColor;
  const size = tool === 'pen' ? penSize : tool === 'highlight' ? hiSize : eraseSize;
  const setSize = tool === 'pen' ? setPenSize : tool === 'highlight' ? setHiSize : setEraseSize;

  return (
    <Screen padded={false}>
      <View style={styles.head}>
        <Header
          title="Draw"
          onBack={back}
          right={
            <IconButton icon={Check} onPress={save} accessibilityLabel="Save drawing" color={theme.colors.brand} />
          }
        />
      </View>

      <View style={[styles.canvas, { backgroundColor: theme.colors.surfaceSunken }]}>
        <AnnotationCanvas
          uri={uri}
          strokes={strokes}
          tool={tool}
          color={color}
          width={width}
          opacity={opacity}
          onCommit={commit}
          onErase={erase}
        />
      </View>

      <View style={[styles.bar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        {/* tools + undo/redo */}
        <View style={styles.toolRow}>
          <View style={styles.tools}>
            <ToolBtn active={tool === 'pen'} icon={Pen} label="Pen" onPress={() => setTool('pen')} />
            <ToolBtn active={tool === 'highlight'} icon={Highlighter} label="Marker" onPress={() => setTool('highlight')} />
            <ToolBtn active={tool === 'erase'} icon={Eraser} label="Erase" onPress={() => setTool('erase')} />
          </View>
          <View style={styles.tools}>
            <IconButton icon={Undo2} onPress={undo} disabled={!canUndo} accessibilityLabel="Undo" />
            <IconButton icon={Redo2} onPress={redo} disabled={!canRedo} accessibilityLabel="Redo" />
          </View>
        </View>

        {/* colours (not for eraser) */}
        {tool !== 'erase' && (
          <View style={styles.colors}>
            {colors.map(c => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                hitSlop={HIT_SLOP}
                accessibilityLabel={`Color ${c}`}
                style={[
                  styles.swatch,
                  { backgroundColor: c, borderColor: color === c ? theme.colors.brand : theme.colors.border, borderWidth: color === c ? 3 : StyleSheet.hairlineWidth },
                ]}
              />
            ))}
          </View>
        )}

        <Slider
          label={tool === 'erase' ? 'Eraser size' : 'Size'}
          value={size}
          min={2}
          max={tool === 'erase' ? 40 : 40}
          onChange={v => setSize(Math.round(v))}
          format={v => `${Math.round(v)}`}
        />
        {tool !== 'erase' && (
          <Slider
            label="Opacity"
            value={opacity}
            min={0.1}
            max={1}
            onChange={v => (tool === 'pen' ? setPenOpacity(v) : setHiOpacity(v))}
            format={v => `${Math.round(v * 100)}%`}
          />
        )}
      </View>
    </Screen>
  );
}

function ToolBtn({
  active,
  icon: Icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: typeof Pen;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.toolBtn,
        { backgroundColor: active ? theme.colors.brandSubtle : theme.colors.surfaceAlt, borderRadius: theme.radius.md },
      ]}
    >
      <Icon size={18} color={active ? theme.colors.brand : theme.colors.textSecondary} />
      <Text variant="caption" color={active ? 'brand' : 'textSecondary'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 20 },
  canvas: { flex: 1, marginHorizontal: 12, marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  bar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, borderTopWidth: StyleSheet.hairlineWidth },
  toolRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolBtn: { alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 14, paddingVertical: 8, minWidth: 60 },
  colors: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'center' },
  swatch: { width: 28, height: 28, borderRadius: 14 },
});
