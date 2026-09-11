import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import {
  Canvas,
  Path,
  Skia,
  Image as SkiaImage,
  ColorMatrix,
  Blur,
  RuntimeShader,
  useImage,
} from '@shopify/react-native-skia';
import {
  RotateCw,
  RefreshCcw,
  Check,
  Crop,
  SlidersHorizontal,
  FlipHorizontal,
  FlipVertical,
  Wand2,
  Eye,
  Undo2,
  Redo2,
  Sparkles,
  ScanText,
} from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { Slider } from '../components/Slider';
import { LoadingState } from '../components/LoadingState';
import { useToast } from '../components/Toast';
import { warpDocument, type Quad } from '../services/image/perspective';
import { detailImageFilter, previewBlurSigma } from '../services/image/detail';
import { toneImageFilter, TONE_EFFECT } from '../services/image/tone';
import { documentCleanup } from '../services/image/cleanup';
import {
  FILTERS,
  buildMatrix,
  type FilterKey,
} from '../services/image/filters';
import { useTheme } from '../theme';
import { useT } from '../i18n';
import type { RootScreenProps } from '../types/navigation';

type XY = { x: number; y: number };
type Mode = 'crop' | 'filter';
type Adj = {
  filter: FilterKey;
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  detail: number;
  shadows: number;
  highlights: number;
  flipH: boolean;
  flipV: boolean;
  rotation: number;
};
const HANDLE = 28;
const TOUCH = 48;

/** Aspect-ratio crop presets (label + width/height ratio; null = free crop). */
const CROP_RATIOS: { label: string; ar: number | null }[] = [
  { label: 'Free', ar: null },
  { label: '1:1', ar: 1 },
  { label: '4:3', ar: 4 / 3 },
  { label: '3:4', ar: 3 / 4 },
  { label: '16:9', ar: 16 / 9 },
  { label: '9:16', ar: 9 / 16 },
  { label: 'A4', ar: 210 / 297 },
];

function adjEqual(a: Adj, b: Adj) {
  return (
    a.filter === b.filter &&
    a.brightness === b.brightness &&
    a.contrast === b.contrast &&
    a.saturation === b.saturation &&
    a.warmth === b.warmth &&
    a.detail === b.detail &&
    a.shadows === b.shadows &&
    a.highlights === b.highlights &&
    a.flipH === b.flipH &&
    a.flipV === b.flipV &&
    a.rotation === b.rotation
  );
}

function fit(natW: number, natH: number, boxW: number, boxH: number) {
  const scale = Math.min(boxW / natW, boxH / natH);
  const w = natW * scale;
  const h = natH * scale;
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h };
}

export function EditorScreen({ route, navigation }: RootScreenProps<'Editor'>) {
  const theme = useTheme();
  const t = useT();
  const toast = useToast();
  const { uri, onDone } = route.params;

  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [rotation, setRotation] = useState(0);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>('crop');
  const [filter, setFilter] = useState<FilterKey>('original');
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [warmth, setWarmth] = useState(0);
  const [detail, setDetail] = useState(0); // <0 blur, >0 sharpen
  const [shadows, setShadows] = useState(0);
  const [highlights, setHighlights] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [undoStack, setUndoStack] = useState<Adj[]>([]);
  const [redoStack, setRedoStack] = useState<Adj[]>([]);
  const [comparing, setComparing] = useState(false);
  const [cleanedUri, setCleanedUri] = useState<string | null>(null);
  const [cleanOn, setCleanOn] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  // The image the editor operates on: cleaned document, or the original.
  const workUri = cleanOn && cleanedUri ? cleanedUri : uri;

  const snapshot = useCallback(
    (): Adj => ({ filter, brightness, contrast, saturation, warmth, detail, shadows, highlights, flipH, flipV, rotation }),
    [filter, brightness, contrast, saturation, warmth, detail, shadows, highlights, flipH, flipV, rotation],
  );
  const restore = useCallback((a: Adj) => {
    setFilter(a.filter);
    setBrightness(a.brightness);
    setContrast(a.contrast);
    setSaturation(a.saturation);
    setWarmth(a.warmth);
    setDetail(a.detail);
    setShadows(a.shadows);
    setHighlights(a.highlights);
    setFlipH(a.flipH);
    setFlipV(a.flipV);
    setRotation(a.rotation);
  }, []);
  // Snapshot the pre-change state; call before any discrete edit / at drag start.
  const commit = useCallback(() => {
    const cur = snapshot();
    setUndoStack(s => (s.length && adjEqual(s[s.length - 1], cur) ? s : [...s.slice(-49), cur]));
    setRedoStack([]);
  }, [snapshot]);
  const undo = useCallback(() => {
    setUndoStack(s => {
      if (!s.length) return s;
      setRedoStack(r => [...r, snapshot()]);
      restore(s[s.length - 1]);
      return s.slice(0, -1);
    });
  }, [snapshot, restore]);
  const redo = useCallback(() => {
    setRedoStack(r => {
      if (!r.length) return r;
      setUndoStack(s => [...s, snapshot()]);
      restore(r[r.length - 1]);
      return r.slice(0, -1);
    });
  }, [snapshot, restore]);

  const skImage = useImage(workUri);

  useEffect(() => {
    Image.getSize(
      workUri,
      (w, h) => setNat({ w, h }),
      () => setNat({ w: 1000, h: 1414 }),
    );
  }, [workUri]);

  const rot = useMemo(() => {
    if (!nat) return null;
    const swap = rotation === 90 || rotation === 270;
    return { w: swap ? nat.h : nat.w, h: swap ? nat.w : nat.h };
  }, [nat, rotation]);

  const frame = useMemo(() => {
    if (!rot || !box) return null;
    return fit(rot.w, rot.h, box.w, box.h);
  }, [rot, box]);

  const tl = useSharedValue<XY>({ x: 0, y: 0 });
  const tr = useSharedValue<XY>({ x: 0, y: 0 });
  const br = useSharedValue<XY>({ x: 0, y: 0 });
  const bl = useSharedValue<XY>({ x: 0, y: 0 });

  const resetCorners = useCallback(() => {
    if (!frame) return;
    tl.value = { x: frame.x, y: frame.y };
    tr.value = { x: frame.x + frame.w, y: frame.y };
    br.value = { x: frame.x + frame.w, y: frame.y + frame.h };
    bl.value = { x: frame.x, y: frame.y + frame.h };
  }, [frame, tl, tr, br, bl]);

  useEffect(() => {
    resetCorners();
  }, [resetCorners]);

  const previewMatrix = useMemo(
    () => buildMatrix(filter, brightness, contrast, saturation, warmth),
    [filter, brightness, contrast, saturation, warmth],
  );

  // Hold-to-compare shows the untouched original (adjustments/flip/blur dropped;
  // crop + rotation stay, since they define the frame you're comparing within).
  const displayMatrix = comparing ? buildMatrix('original', 0, 0) : previewMatrix;
  const displaySigma = comparing ? 0 : previewBlurSigma(detail);
  const showTone = !comparing && TONE_EFFECT != null && (shadows !== 0 || highlights !== 0);

  // Export image filter = sharpen/blur composed with the highlights/shadows tone
  // curve (both baked in warpDocument's single pass).
  const composeFilter = useCallback(() => {
    const d = detailImageFilter(detail);
    const tone = toneImageFilter(shadows, highlights);
    if (d && tone) return Skia.ImageFilter.MakeCompose(tone, d);
    return tone ?? d;
  }, [detail, shadows, highlights]);

  // Document cleanup toggle: run the shadow/background removal once, cache it,
  // and flip between the cleaned image and the original.
  const toggleClean = useCallback(async () => {
    if (cleanOn) { setCleanOn(false); return; }
    if (cleanedUri) { setCleanOn(true); return; }
    setCleaning(true);
    try {
      const cleaned = await documentCleanup(uri);
      setCleanedUri(cleaned);
      setCleanOn(true);
    } catch {
      toast({ variant: 'error', message: t('editor.tryAgain') });
    } finally {
      setCleaning(false);
    }
  }, [cleanOn, cleanedUri, uri, toast, t]);

  const autoEnhance = useCallback(() => {
    commit();
    setFilter('magic');
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setWarmth(0);
    setDetail(0);
    setShadows(0);
    setHighlights(0);
  }, [commit]);

  // Snap the crop quad to a centered rect of the given aspect ratio (null = full).
  const applyRatio = useCallback(
    (ar: number | null) => {
      if (!frame) return;
      if (ar == null) {
        resetCorners();
        return;
      }
      const fAr = frame.w / frame.h;
      const w = fAr > ar ? frame.h * ar : frame.w;
      const h = fAr > ar ? frame.h : frame.w / ar;
      const x = frame.x + (frame.w - w) / 2;
      const y = frame.y + (frame.h - h) / 2;
      tl.value = { x, y };
      tr.value = { x: x + w, y };
      br.value = { x: x + w, y: y + h };
      bl.value = { x, y: y + h };
    },
    [frame, resetCorners, tl, tr, br, bl],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox({ w: width, h: height });
  };

  const confirm = async () => {
    if (!frame || !rot || frame.w === 0 || frame.h === 0) return;
    const sx = rot.w / frame.w;
    const sy = rot.h / frame.h;
    const toSrc = (p: XY): XY => ({
      x: (p.x - frame.x) * sx,
      y: (p.y - frame.y) * sy,
    });
    const corners: Quad = [toSrc(tl.value), toSrc(tr.value), toSrc(br.value), toSrc(bl.value)];
    const isNeutralColor =
      filter === 'original' &&
      brightness === 0 &&
      contrast === 0 &&
      saturation === 0 &&
      warmth === 0;
    setBusy(true);
    try {
      const out = await warpDocument({
        uri: workUri,
        corners,
        rotation,
        flipH,
        flipV,
        quality: 92,
        colorMatrix: isNeutralColor ? undefined : previewMatrix,
        imageFilter: composeFilter(),
      });
      onDone(out);
      navigation.goBack();
    } catch {
      setBusy(false);
      toast({ variant: 'error', message: t('editor.tryAgain') });
    }
  };

  if (busy) {
    return (
      <Screen center>
        <LoadingState label={t('editor.enhancing')} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.headerPad}>
        <Header title={t('editor.title')} onBack={() => navigation.goBack()} />
        <View style={styles.tabRow}>
          <View style={styles.segWrap}>
            <SegTabs mode={mode} onChange={setMode} />
          </View>
          <Pressable
            onPress={() => navigation.navigate('Ocr', { uri: workUri, name: 'Image', kind: 'image' })}
            accessibilityRole="button"
            accessibilityLabel={t('editor.extractText')}
            style={styles.iconBtn}
          >
            <ScanText size={20} color={theme.colors.text} />
          </Pressable>
          <Pressable
            onPress={undo}
            disabled={!undoStack.length}
            accessibilityRole="button"
            accessibilityLabel={t('editor.undo')}
            style={[styles.iconBtn, { opacity: undoStack.length ? 1 : 0.35 }]}
          >
            <Undo2 size={20} color={theme.colors.text} />
          </Pressable>
          <Pressable
            onPress={redo}
            disabled={!redoStack.length}
            accessibilityRole="button"
            accessibilityLabel={t('editor.redo')}
            style={[styles.iconBtn, { opacity: redoStack.length ? 1 : 0.35 }]}
          >
            <Redo2 size={20} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>

      <View style={styles.canvasArea} onLayout={onLayout}>
        {frame && rot ? (
          mode === 'crop' ? (
            <>
              <Image
                source={{ uri: workUri }}
                style={{
                  position: 'absolute',
                  left: frame.x,
                  top: frame.y,
                  width: frame.w,
                  height: frame.h,
                  transform: [{ rotate: `${rotation}deg` }],
                }}
                resizeMode="stretch"
              />
              <QuadOverlay tl={tl} tr={tr} br={br} bl={bl} color={theme.colors.brand} />
              <Handle p={tl} frame={frame} />
              <Handle p={tr} frame={frame} />
              <Handle p={br} frame={frame} />
              <Handle p={bl} frame={frame} />
            </>
          ) : (
            <Canvas
              style={[
                StyleSheet.absoluteFill,
                {
                  transform: [
                    { scaleX: !comparing && flipH ? -1 : 1 },
                    { scaleY: !comparing && flipV ? -1 : 1 },
                  ],
                },
              ]}
            >
              {skImage ? (
                <SkiaImage
                  image={skImage}
                  x={frame.x}
                  y={frame.y}
                  width={frame.w}
                  height={frame.h}
                  fit="fill"
                >
                  <ColorMatrix matrix={displayMatrix} />
                  {displaySigma > 0 ? <Blur blur={displaySigma} /> : null}
                  {showTone && TONE_EFFECT ? (
                    <RuntimeShader source={TONE_EFFECT} uniforms={{ shadows, highlights }} />
                  ) : null}
                </SkiaImage>
              ) : null}
            </Canvas>
          )
        ) : (
          <LoadingState />
        )}
      </View>

      <View style={[styles.toolbar, { borderTopColor: theme.colors.border }]}>
        {mode === 'crop' ? (
          <>
            <View style={styles.tools}>
              <Button
                title={t('editor.rotate')}
                icon={RotateCw}
                variant="secondary"
                fullWidth={false}
                style={styles.tool}
                onPress={() => {
                  commit();
                  setRotation(r => (r + 90) % 360);
                }}
              />
              <Button
                title={t('editor.reset')}
                icon={RefreshCcw}
                variant="secondary"
                fullWidth={false}
                style={styles.tool}
                onPress={resetCorners}
              />
            </View>
            <View style={styles.tools}>
              <Button
                title={t('editor.flipH')}
                icon={FlipHorizontal}
                variant={flipH ? 'primary' : 'secondary'}
                fullWidth={false}
                style={styles.tool}
                onPress={() => {
                  commit();
                  setFlipH(v => !v);
                }}
              />
              <Button
                title={t('editor.flipV')}
                icon={FlipVertical}
                variant={flipV ? 'primary' : 'secondary'}
                fullWidth={false}
                style={styles.tool}
                onPress={() => {
                  commit();
                  setFlipV(v => !v);
                }}
              />
            </View>
            <Button
              title={cleanOn ? t('editor.cleanupOn') : t('editor.cleanup')}
              icon={Sparkles}
              variant={cleanOn ? 'primary' : 'secondary'}
              loading={cleaning}
              onPress={toggleClean}
              style={styles.cleanupBtn}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.ratios}
            >
              {CROP_RATIOS.map(r => (
                <Pressable
                  key={r.label}
                  onPress={() => applyRatio(r.ar)}
                  accessibilityRole="button"
                  accessibilityLabel={r.label}
                  style={[
                    styles.ratioChip,
                    { borderColor: theme.colors.border, borderRadius: theme.radius.sm },
                  ]}
                >
                  <Text variant="label" color="textSecondary">
                    {r.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text variant="caption" color="textTertiary" style={styles.hint}>
              {flipH || flipV ? t('editor.flipHint') : t('editor.cropHint')}
            </Text>
          </>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbs}
            >
              {FILTERS.map(f => (
                <FilterThumb
                  key={f.key}
                  label={f.label}
                  image={skImage}
                  filterKey={f.key}
                  selected={filter === f.key}
                  onPress={() => {
                    commit();
                    setFilter(f.key);
                  }}
                />
              ))}
            </ScrollView>
            <View style={styles.tools}>
              <Button
                title={t('editor.autoEnhance')}
                icon={Wand2}
                variant="secondary"
                fullWidth={false}
                style={styles.tool}
                onPress={autoEnhance}
              />
              <Pressable
                onPressIn={() => setComparing(true)}
                onPressOut={() => setComparing(false)}
                accessibilityRole="button"
                accessibilityLabel={t('editor.compare')}
                style={[
                  styles.tool,
                  styles.compareBtn,
                  {
                    borderColor: theme.colors.borderStrong,
                    borderRadius: theme.radius.md,
                    backgroundColor: comparing ? theme.colors.surfaceSunken : theme.colors.surface,
                  },
                ]}
              >
                <Eye size={theme.iconSize.sm} color={theme.colors.text} />
                <Text variant="bodyStrong">{t('editor.compare')}</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.sliderScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              <Slider label={t('editor.brightness')} value={brightness} onChange={setBrightness} onCommit={commit} />
              <Slider label={t('editor.contrast')} value={contrast} onChange={setContrast} onCommit={commit} />
              <Slider label={t('editor.saturation')} value={saturation} onChange={setSaturation} onCommit={commit} />
              <Slider label={t('editor.warmth')} value={warmth} onChange={setWarmth} onCommit={commit} />
              <Slider label={t('editor.highlights')} value={highlights} onChange={setHighlights} onCommit={commit} />
              <Slider label={t('editor.shadows')} value={shadows} onChange={setShadows} onCommit={commit} />
              <Slider label={t('editor.detail')} value={detail} onChange={setDetail} onCommit={commit} />
            </ScrollView>
          </>
        )}
        <Button title={t('editor.apply')} icon={Check} onPress={confirm} />
      </View>
    </Screen>
  );
}

function SegTabs({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const theme = useTheme();
  const t = useT();
  const tabs: { key: Mode; label: string; icon: typeof Crop }[] = [
    { key: 'crop', label: t('editor.crop'), icon: Crop },
    { key: 'filter', label: t('editor.filters'), icon: SlidersHorizontal },
  ];
  return (
    <View style={[styles.seg, { backgroundColor: theme.colors.surfaceSunken, borderRadius: theme.radius.md }]}>
      {tabs.map(t => {
        const active = mode === t.key;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[
              styles.segItem,
              { borderRadius: theme.radius.md - 3 },
              active && { backgroundColor: theme.colors.surface },
              active && theme.elevation(1),
            ]}
          >
            <t.icon size={16} color={active ? theme.colors.brand : theme.colors.textSecondary} />
            <Text variant="callout" color={active ? 'brand' : 'textSecondary'}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function FilterThumb({
  label,
  image,
  filterKey,
  selected,
  onPress,
}: {
  label: string;
  image: ReturnType<typeof useImage>;
  filterKey: FilterKey;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const matrix = useMemo(() => buildMatrix(filterKey, 0, 0), [filterKey]);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.thumb}>
      <View
        style={[
          styles.thumbImg,
          {
            borderColor: selected ? theme.colors.brand : theme.colors.border,
            borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
            borderRadius: theme.radius.sm,
          },
        ]}
      >
        <Canvas style={StyleSheet.absoluteFill}>
          {image ? (
            <SkiaImage image={image} x={0} y={0} width={64} height={80} fit="cover">
              <ColorMatrix matrix={matrix} />
            </SkiaImage>
          ) : null}
        </Canvas>
      </View>
      <Text variant="label" color={selected ? 'brand' : 'textSecondary'} style={styles.thumbLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

function QuadOverlay({
  tl,
  tr,
  br,
  bl,
  color,
}: {
  tl: SharedValue<XY>;
  tr: SharedValue<XY>;
  br: SharedValue<XY>;
  bl: SharedValue<XY>;
  color: string;
}) {
  const path = useDerivedValue(() =>
    Skia.PathBuilder.Make()
      .moveTo(tl.value.x, tl.value.y)
      .lineTo(tr.value.x, tr.value.y)
      .lineTo(br.value.x, br.value.y)
      .lineTo(bl.value.x, bl.value.y)
      .close()
      .build(),
  );
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path path={path} color="rgba(46,107,255,0.14)" style="fill" />
      <Path path={path} color={color} style="stroke" strokeWidth={2} />
    </Canvas>
  );
}

function Handle({
  p,
  frame,
}: {
  p: SharedValue<XY>;
  frame: { x: number; y: number; w: number; h: number };
}) {
  const start = useSharedValue<XY>({ x: 0, y: 0 });
  const pan = Gesture.Pan()
    .onStart(() => {
      start.value = { x: p.value.x, y: p.value.y };
    })
    .onUpdate(e => {
      const nx = Math.min(Math.max(start.value.x + e.translationX, frame.x), frame.x + frame.w);
      const ny = Math.min(Math.max(start.value.y + e.translationY, frame.y), frame.y + frame.h);
      p.value = { x: nx, y: ny };
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: p.value.x - TOUCH / 2 }, { translateY: p.value.y - TOUCH / 2 }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.touch, style]}>
        <View style={styles.handle} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  headerPad: { paddingHorizontal: 20 },
  seg: { flexDirection: 'row', padding: 3, marginBottom: 8 },
  segItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  tabRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  segWrap: { flex: 1 },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  sliderScroll: { maxHeight: 240 },
  cleanupBtn: { marginBottom: 12 },
  ratios: { gap: 8, paddingVertical: 4, marginBottom: 12 },
  ratioChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  compareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderWidth: StyleSheet.hairlineWidth,
  },
  canvasArea: { flex: 1, margin: 12 },
  toolbar: { padding: 20, borderTopWidth: StyleSheet.hairlineWidth },
  tools: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  tool: { flex: 1 },
  hint: { textAlign: 'center', marginBottom: 12 },
  thumbs: { gap: 12, paddingVertical: 4, paddingRight: 8, marginBottom: 12 },
  thumb: { alignItems: 'center', width: 64 },
  thumbImg: { width: 64, height: 80, overflow: 'hidden' },
  thumbLabel: { marginTop: 6 },
  touch: {
    position: 'absolute',
    width: TOUCH,
    height: TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: HANDLE,
    height: HANDLE,
    borderRadius: HANDLE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#2E6BFF',
  },
});
