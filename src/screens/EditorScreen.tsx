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
  Group,
} from '@shopify/react-native-skia';
import LinearGradient from 'react-native-linear-gradient';
import {
  ChevronLeft,
  Check,
  Crop,
  SlidersHorizontal,
  ScanText,
  Undo2,
  Redo2,
  RotateCw,
  RotateCcw,
  RefreshCcw,
  FlipHorizontal2,
  FlipVertical2,
  MoreHorizontal,
  Wand2,
  Eye,
  Sparkles,
} from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Slider } from '../components/Slider';
import { LoadingState } from '../components/LoadingState';
import { useToast } from '../components/Toast';
import { ActionSheet, type SheetAction } from '../components/ActionSheet';
import { warpDocument, type Quad } from '../services/image/perspective';
import { detailImageFilter, previewBlurSigma } from '../services/image/detail';
import { toneImageFilter, TONE_EFFECT } from '../services/image/tone';
import { documentCleanup } from '../services/image/cleanup';
import {
  FILTERS,
  buildMatrix,
  type FilterKey,
} from '../services/image/filters';
import { useTheme, HIT_SLOP } from '../theme';
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
const TOUCH = 52;

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
  const [selectedRatio, setSelectedRatio] = useState<string>('Free');
  const [moreMenuVisible, setMoreMenuVisible] = useState(false);

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

  const isRotated90or270 = rotation === 90 || rotation === 270;

  const moreActions: SheetAction[] = useMemo(() => [
    {
      label: t('editor.resetCorners') || 'Reset corners',
      icon: RefreshCcw,
      onPress: () => {
        resetCorners();
        setSelectedRatio('Free');
      },
    },
    {
      label: cleanOn ? (t('editor.cleanupOn') || 'Document Cleaned (Active)') : (t('editor.cleanup') || 'Clean up document'),
      icon: Sparkles,
      onPress: toggleClean,
    },
    {
      label: t('editor.autoEnhance') || 'Auto Enhance',
      icon: Wand2,
      onPress: autoEnhance,
    },
    {
      label: t('editor.resetAll') || 'Reset all changes',
      icon: RotateCcw,
      destructive: true,
      onPress: () => {
        commit();
        setRotation(0);
        setFlipH(false);
        setFlipV(false);
        setFilter('original');
        setBrightness(0);
        setContrast(0);
        setSaturation(0);
        setWarmth(0);
        setDetail(0);
        setShadows(0);
        setHighlights(0);
        setCleanOn(false);
        resetCorners();
        setSelectedRatio('Free');
      },
    },
  ], [t, resetCorners, cleanOn, toggleClean, autoEnhance, commit]);

  if (busy) {
    return (
      <Screen center>
        <LoadingState label={t('editor.enhancing')} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      {/* 1. Sleek Top Header */}
      <View style={styles.topHeader}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.headerBtn}
        >
          <ChevronLeft size={24} color={theme.colors.text} />
        </Pressable>
        <Text variant="title" style={styles.headerTitle}>
          {t('editor.title')}
        </Text>
        <Pressable
          onPress={confirm}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={t('editor.apply')}
          style={styles.headerBtn}
        >
          <Check size={22} color={theme.colors.brand} />
        </Pressable>
      </View>

      {/* 2. Top Sub-Navigation Bar: Crop, Filters, OCR, Undo, Redo */}
      <View style={[styles.subNavBar, { borderBottomColor: theme.colors.border }]}>
        <Pressable
          onPress={() => setMode('crop')}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'crop' }}
          style={[
            styles.subNavItem,
            mode === 'crop' && [styles.subNavActiveItem, { backgroundColor: theme.colors.brandSubtle }],
          ]}
        >
          <Crop size={16} color={mode === 'crop' ? theme.colors.brand : theme.colors.textSecondary} />
          <Text
            variant="callout"
            style={[
              styles.subNavText,
              { color: mode === 'crop' ? theme.colors.brand : theme.colors.textSecondary },
              mode === 'crop' && styles.subNavActiveText,
            ]}
          >
            {t('editor.crop')}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setMode('filter')}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'filter' }}
          style={[
            styles.subNavItem,
            mode === 'filter' && [styles.subNavActiveItem, { backgroundColor: theme.colors.brandSubtle }],
          ]}
        >
          <SlidersHorizontal size={16} color={mode === 'filter' ? theme.colors.brand : theme.colors.textSecondary} />
          <Text
            variant="callout"
            style={[
              styles.subNavText,
              { color: mode === 'filter' ? theme.colors.brand : theme.colors.textSecondary },
              mode === 'filter' && styles.subNavActiveText,
            ]}
          >
            {t('editor.filters')}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('Ocr', { uri: workUri, name: 'Image', kind: 'image' })}
          accessibilityRole="button"
          accessibilityLabel={t('editor.extractText')}
          style={styles.subNavItem}
        >
          <ScanText size={16} color={theme.colors.textSecondary} />
          <Text variant="callout" style={[styles.subNavText, { color: theme.colors.textSecondary }]}>
            OCR
          </Text>
        </Pressable>

        <Pressable
          onPress={undo}
          disabled={!undoStack.length}
          accessibilityRole="button"
          accessibilityLabel={t('editor.undo')}
          style={[styles.subNavItem, { opacity: undoStack.length ? 1 : 0.35 }]}
        >
          <Undo2 size={16} color={theme.colors.textSecondary} />
          <Text variant="callout" style={[styles.subNavText, { color: theme.colors.textSecondary }]}>
            {t('editor.undo')}
          </Text>
        </Pressable>

        <Pressable
          onPress={redo}
          disabled={!redoStack.length}
          accessibilityRole="button"
          accessibilityLabel={t('editor.redo')}
          style={[styles.subNavItem, { opacity: redoStack.length ? 1 : 0.35 }]}
        >
          <Redo2 size={16} color={theme.colors.textSecondary} />
          <Text variant="callout" style={[styles.subNavText, { color: theme.colors.textSecondary }]}>
            {t('editor.redo')}
          </Text>
        </Pressable>
      </View>

      {/* 3. Document Preview Area - Dominates 60-70% of the screen */}
      <View style={styles.canvasArea} onLayout={onLayout}>
        {frame && rot ? (
          mode === 'crop' ? (
            <>
              <Image
                source={{ uri: workUri }}
                style={{
                  position: 'absolute',
                  left: isRotated90or270 ? frame.x + (frame.w - frame.h) / 2 : frame.x,
                  top: isRotated90or270 ? frame.y + (frame.h - frame.w) / 2 : frame.y,
                  width: isRotated90or270 ? frame.h : frame.w,
                  height: isRotated90or270 ? frame.w : frame.h,
                  transform: [
                    { rotate: `${rotation}deg` },
                    { scaleX: flipH ? -1 : 1 },
                    { scaleY: flipV ? -1 : 1 },
                  ],
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
            <Canvas style={StyleSheet.absoluteFill}>
              {skImage ? (
                <Group
                  origin={{ x: frame.x + frame.w / 2, y: frame.y + frame.h / 2 }}
                  transform={[
                    { rotate: (rotation * Math.PI) / 180 },
                    { scaleX: !comparing && flipH ? -1 : 1 },
                    { scaleY: !comparing && flipV ? -1 : 1 },
                  ]}
                >
                  <SkiaImage
                    image={skImage}
                    x={isRotated90or270 ? frame.x + (frame.w - frame.h) / 2 : frame.x}
                    y={isRotated90or270 ? frame.y + (frame.h - frame.w) / 2 : frame.y}
                    width={isRotated90or270 ? frame.h : frame.w}
                    height={isRotated90or270 ? frame.w : frame.h}
                    fit="fill"
                  >
                    <ColorMatrix matrix={displayMatrix} />
                    {displaySigma > 0 ? <Blur blur={displaySigma} /> : null}
                    {showTone && TONE_EFFECT ? (
                      <RuntimeShader source={TONE_EFFECT} uniforms={{ shadows, highlights }} />
                    ) : null}
                  </SkiaImage>
                </Group>
              ) : null}
            </Canvas>
          )
        ) : (
          <LoadingState />
        )}
      </View>

      {/* 4. Streamlined Bottom Controls */}
      <View style={[styles.controlsArea, { borderTopColor: theme.colors.border }]}>
        {mode === 'crop' ? (
          <>
            <Text variant="caption" style={[styles.hint, { color: theme.colors.textTertiary }]}>
              {flipH || flipV ? t('editor.flipHint') : t('editor.cropHint')}
            </Text>

            {/* Compact Quick Actions Row: Rotate, Flip H, Flip V, More */}
            <View style={styles.quickBar}>
              <Pressable
                onPress={() => {
                  commit();
                  setRotation(r => (r + 90) % 360);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('editor.rotate')}
                style={({ pressed }) => [
                  styles.quickBarBtn,
                  { backgroundColor: theme.colors.surfaceAlt },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <RotateCw size={16} color={theme.colors.text} />
                <Text variant="caption" style={[styles.quickBarText, { color: theme.colors.text }]}>
                  {t('editor.rotate')}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  commit();
                  setFlipH(v => !v);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('editor.flipH')}
                style={({ pressed }) => [
                  styles.quickBarBtn,
                  {
                    backgroundColor: flipH ? theme.colors.brandSubtle : theme.colors.surfaceAlt,
                    borderColor: flipH ? theme.colors.brand : 'transparent',
                    borderWidth: flipH ? 1 : 0,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <FlipHorizontal2 size={16} color={flipH ? theme.colors.brand : theme.colors.text} />
                <Text
                  variant="caption"
                  style={[
                    styles.quickBarText,
                    { color: flipH ? theme.colors.brand : theme.colors.text },
                    flipH && { fontWeight: '700' },
                  ]}
                >
                  {t('editor.flipH')}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  commit();
                  setFlipV(v => !v);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('editor.flipV')}
                style={({ pressed }) => [
                  styles.quickBarBtn,
                  {
                    backgroundColor: flipV ? theme.colors.brandSubtle : theme.colors.surfaceAlt,
                    borderColor: flipV ? theme.colors.brand : 'transparent',
                    borderWidth: flipV ? 1 : 0,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <FlipVertical2 size={16} color={flipV ? theme.colors.brand : theme.colors.text} />
                <Text
                  variant="caption"
                  style={[
                    styles.quickBarText,
                    { color: flipV ? theme.colors.brand : theme.colors.text },
                    flipV && { fontWeight: '700' },
                  ]}
                >
                  {t('editor.flipV')}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setMoreMenuVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={t('editor.more') || 'More'}
                style={({ pressed }) => [
                  styles.quickBarBtn,
                  { backgroundColor: theme.colors.surfaceAlt },
                  cleanOn && { borderColor: theme.colors.brand, borderWidth: 1 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <MoreHorizontal size={16} color={cleanOn ? theme.colors.brand : theme.colors.text} />
                <Text
                  variant="caption"
                  style={[
                    styles.quickBarText,
                    { color: cleanOn ? theme.colors.brand : theme.colors.text },
                    cleanOn && { fontWeight: '700' },
                  ]}
                >
                  {t('editor.more') || 'More'}
                </Text>
                {cleanOn && <View style={[styles.activeDot, { backgroundColor: theme.colors.brand }]} />}
              </Pressable>
            </View>

            {/* Aspect Ratio Horizontally Scrollable Compact Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.ratioChipsContainer}
              style={styles.ratioScroll}
            >
              {CROP_RATIOS.map(r => {
                const isSelected = selectedRatio === r.label;
                return (
                  <Pressable
                    key={r.label}
                    onPress={() => {
                      setSelectedRatio(r.label);
                      applyRatio(r.ar);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={r.label}
                    style={[
                      styles.ratioChip,
                      {
                        backgroundColor: isSelected ? theme.colors.brand : theme.colors.surfaceAlt,
                        borderColor: isSelected ? theme.colors.brand : theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      variant="label"
                      style={[
                        styles.ratioChipText,
                        { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary },
                        isSelected && { fontWeight: '700' },
                      ]}
                    >
                      {r.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : (
          <>
            {/* Filter Mode Quick Actions */}
            <View style={styles.quickBar}>
              <Pressable
                onPress={autoEnhance}
                style={[styles.quickBarBtn, { backgroundColor: theme.colors.surfaceAlt }]}
              >
                <Wand2 size={16} color={theme.colors.brand} />
                <Text variant="caption" style={[styles.quickBarText, { color: theme.colors.brand, fontWeight: '700' }]}>
                  {t('editor.autoEnhance')}
                </Text>
              </Pressable>

              <Pressable
                onPressIn={() => setComparing(true)}
                onPressOut={() => setComparing(false)}
                style={[
                  styles.quickBarBtn,
                  { backgroundColor: comparing ? theme.colors.surfaceSunken : theme.colors.surfaceAlt },
                ]}
              >
                <Eye size={16} color={theme.colors.text} />
                <Text variant="caption" style={[styles.quickBarText, { color: theme.colors.text }]}>
                  {t('editor.compare')}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  commit();
                  setFilter('original');
                  setBrightness(0);
                  setContrast(0);
                  setSaturation(0);
                  setWarmth(0);
                  setDetail(0);
                  setShadows(0);
                  setHighlights(0);
                }}
                style={[styles.quickBarBtn, { backgroundColor: theme.colors.surfaceAlt }]}
              >
                <RotateCcw size={16} color={theme.colors.text} />
                <Text variant="caption" style={[styles.quickBarText, { color: theme.colors.text }]}>
                  {t('editor.reset')}
                </Text>
              </Pressable>
            </View>

            {/* Filter Presets Thumbnails */}
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

            {/* Fine-Tuning Sliders */}
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

        {/* 5. Fixed Prominent Bottom Action: Apply Crop / Apply Filters */}
        <Pressable
          onPress={confirm}
          accessibilityRole="button"
          accessibilityLabel={mode === 'crop' ? t('editor.applyCrop') : t('editor.applyFilters')}
          style={({ pressed }) => [
            styles.applyButton,
            pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
          ]}
        >
          <LinearGradient
            colors={theme.colors.brandGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.applyGradient}
          >
            <Check size={20} color="#FFFFFF" strokeWidth={2.5} />
            <Text variant="bodyStrong" style={styles.applyText}>
              {mode === 'crop' ? t('editor.applyCrop') : t('editor.applyFilters')}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Secondary Actions Modal */}
      <ActionSheet
        visible={moreMenuVisible}
        title={t('editor.more')}
        onClose={() => setMoreMenuVisible(false)}
        actions={moreActions}
      />
    </Screen>
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
            <SkiaImage image={image} x={0} y={0} width={54} height={68} fit="cover">
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
      <Path path={path} color="rgba(123,97,255,0.18)" style="fill" />
      <Path path={path} color={color} style="stroke" strokeWidth={2.5} />
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
  topHeader: {
    height: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  subNavBar: {
    height: 42,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subNavItem: {
    flex: 1,
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  subNavActiveItem: {
    borderRadius: 8,
  },
  subNavText: {
    fontSize: 13,
  },
  subNavActiveText: {
    fontWeight: '700',
  },
  canvasArea: {
    flex: 1,
    marginHorizontal: 12,
    marginVertical: 4,
  },
  controlsArea: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  hint: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 6,
  },
  quickBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  quickBarBtn: {
    flex: 1,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 10,
  },
  quickBarText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    top: 6,
    right: 8,
  },
  ratioScroll: {
    maxHeight: 34,
    marginBottom: 10,
  },
  ratioChipsContainer: {
    gap: 8,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  ratioChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  ratioChipText: {
    fontSize: 12,
  },
  applyButton: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
  },
  applyGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  applyText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  sliderScroll: {
    maxHeight: 130,
    marginBottom: 8,
  },
  thumbs: {
    gap: 10,
    paddingVertical: 4,
    paddingRight: 8,
    marginBottom: 8,
  },
  thumb: {
    alignItems: 'center',
    width: 54,
  },
  thumbImg: {
    width: 54,
    height: 68,
    overflow: 'hidden',
  },
  thumbLabel: {
    marginTop: 4,
    fontSize: 11,
  },
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
    borderWidth: 3.5,
    borderColor: '#7B61FF',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
  },
});
