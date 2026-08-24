import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
  useImage,
} from '@shopify/react-native-skia';
import { RotateCw, RefreshCcw, Check, Crop, SlidersHorizontal } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { Slider } from '../components/Slider';
import { LoadingState } from '../components/LoadingState';
import { warpDocument, type Quad } from '../services/image/perspective';
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
const HANDLE = 28;
const TOUCH = 48;

function fit(natW: number, natH: number, boxW: number, boxH: number) {
  const scale = Math.min(boxW / natW, boxH / natH);
  const w = natW * scale;
  const h = natH * scale;
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h };
}

export function EditorScreen({ route, navigation }: RootScreenProps<'Editor'>) {
  const theme = useTheme();
  const t = useT();
  const { uri, onDone } = route.params;

  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [rotation, setRotation] = useState(0);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>('crop');
  const [filter, setFilter] = useState<FilterKey>('original');
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);

  const skImage = useImage(uri);

  useEffect(() => {
    Image.getSize(
      uri,
      (w, h) => setNat({ w, h }),
      () => setNat({ w: 1000, h: 1414 }),
    );
  }, [uri]);

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
    () => buildMatrix(filter, brightness, contrast),
    [filter, brightness, contrast],
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
    const isNeutral = filter === 'original' && brightness === 0 && contrast === 0;
    setBusy(true);
    try {
      const out = await warpDocument({
        uri,
        corners,
        rotation,
        quality: 92,
        colorMatrix: isNeutral ? undefined : previewMatrix,
      });
      onDone(out);
      navigation.goBack();
    } catch {
      setBusy(false);
      Alert.alert(t('editor.applyFail'), t('editor.tryAgain'));
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
        <SegTabs mode={mode} onChange={setMode} />
      </View>

      <View style={styles.canvasArea} onLayout={onLayout}>
        {frame && rot ? (
          mode === 'crop' ? (
            <>
              <Image
                source={{ uri }}
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
            <Canvas style={StyleSheet.absoluteFill}>
              {skImage ? (
                <SkiaImage
                  image={skImage}
                  x={frame.x}
                  y={frame.y}
                  width={frame.w}
                  height={frame.h}
                  fit="fill"
                >
                  <ColorMatrix matrix={previewMatrix} />
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
                onPress={() => setRotation(r => (r + 90) % 360)}
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
            <Text variant="caption" color="textTertiary" style={styles.hint}>
              {t('editor.cropHint')}
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
                  onPress={() => setFilter(f.key)}
                />
              ))}
            </ScrollView>
            <Slider label={t('editor.brightness')} value={brightness} onChange={setBrightness} />
            <Slider label={t('editor.contrast')} value={contrast} onChange={setContrast} />
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
