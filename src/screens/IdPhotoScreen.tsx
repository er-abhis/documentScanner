import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, type LayoutChangeEvent } from 'react-native';
import { Canvas, Picture, Skia, createPicture, useImage } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { IdCard, ImagePlus, Save, Share2 } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { Slider } from '../components/Slider';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { useToast } from '../components/Toast';
import { pickImages } from '../services/gallery';
import { saveToGallery } from '../services/gallery/save';
import { shareFiles } from '../services/sharing';
import { buildIdPhoto, buildIdSheet, computeCrop, ID_SPECS, type IdSpec } from '../services/image/idphoto';
import { removeBackground, bgRemovalAvailable } from '../services/image/bgRemove';
import { MIME } from '../services/image/encode';
import { haptics } from '../lib/haptics';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

// Common ID / government photo backgrounds (white & blue are the usual specs).
const BACKGROUNDS = [
  { key: 'white', color: '#FFFFFF' },
  { key: 'offwhite', color: '#F2F2F2' },
  { key: 'lightblue', color: '#DCE9F7' },
  { key: 'skyblue', color: '#8CB8E8' },
  { key: 'blue', color: '#2E6BFF' },
  { key: 'gray', color: '#C9C9C9' },
  { key: 'red', color: '#E5484D' },
];
const HEX_RE = /^#([0-9A-F]{6})$/;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function IdPhotoScreen({ navigation }: RootScreenProps<'IdPhoto'>) {
  const theme = useTheme();
  const { lang } = useI18n();
  const hi = lang === 'hi';
  const toast = useToast();

  const [uri, setUri] = useState<string | null>(null);
  const [spec, setSpec] = useState<IdSpec>(ID_SPECS[0]);
  const [mode, setMode] = useState<'single' | 'sheet'>('single');
  const [bg, setBg] = useState(BACKGROUNDS[0].color);
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [boxW, setBoxW] = useState(0);
  const [busy, setBusy] = useState(false);
  const [removeBg, setRemoveBg] = useState(false);
  const [cutoutUri, setCutoutUri] = useState<string | null>(null);
  const [customHex, setCustomHex] = useState('');

  const applyCustom = (v: string) => {
    const s = v.replace(/[^0-9a-fA-F]/g, '').slice(0, 6).toUpperCase();
    setCustomHex(s);
    const full = `#${s}`;
    if (HEX_RE.test(full)) setBg(full);
  };

  const workUri = removeBg && cutoutUri ? cutoutUri : uri;
  const showBgChips = mode === 'sheet' || removeBg;
  const image = useImage(workUri);
  const dims = useMemo(() => (image ? { w: image.width(), h: image.height() } : null), [image]);
  const ar = spec.wMm / spec.hMm;

  // spec-aspect preview frame, capped in height
  let frameW = boxW;
  let frameH = frameW / ar;
  const maxH = 360;
  if (frameH > maxH) { frameH = maxH; frameW = frameH * ar; }

  const startOff = useRef({ x: 0, y: 0 });
  const panStart = () => { startOff.current = off; };
  const panMove = (tx: number, ty: number) => {
    if (!frameW || !frameH) return;
    setOff({
      x: clamp(startOff.current.x - (tx / frameW) * 2, -1, 1),
      y: clamp(startOff.current.y - (ty / frameH) * 2, -1, 1),
    });
  };
  const pan = Gesture.Pan()
    .onStart(() => runOnJS(panStart)())
    .onUpdate(e => runOnJS(panMove)(e.translationX, e.translationY));

  const picture = useMemo(() => {
    if (!image || !dims || !frameW || !frameH) return null;
    const crop = computeCrop(dims.w, dims.h, ar, zoom, off.x, off.y);
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    return createPicture(canvas => {
      canvas.drawImageRect(
        image,
        Skia.XYWHRect(crop.x, crop.y, crop.w, crop.h),
        Skia.XYWHRect(0, 0, frameW, frameH),
        paint,
      );
    });
  }, [image, dims, ar, zoom, off, frameW, frameH]);

  const pick = async () => {
    const [picked] = await pickImages(1);
    if (picked) { setUri(picked); setZoom(1); setOff({ x: 0, y: 0 }); setRemoveBg(false); setCutoutUri(null); }
  };
  const onLayout = (e: LayoutChangeEvent) => setBoxW(e.nativeEvent.layout.width);

  const toggleBg = async () => {
    if (removeBg) { setRemoveBg(false); return; }
    if (!bgRemovalAvailable) {
      toast({ variant: 'error', message: hi ? 'बैकग्राउंड रिमूवल के लिए ऐप रीबिल्ड करें' : 'Rebuild the app to enable background removal' });
      return;
    }
    if (cutoutUri) { setRemoveBg(true); return; }
    if (!uri) return;
    setBusy(true);
    try {
      const cut = await removeBackground(uri);
      setCutoutUri(cut);
      setRemoveBg(true);
      setOff({ x: 0, y: 0 });
    } catch {
      toast({ variant: 'error', message: hi ? 'बैकग्राउंड नहीं हटा सका' : "Couldn't remove background" });
    } finally {
      setBusy(false);
    }
  };

  const render = async (): Promise<string> => {
    if (!workUri) throw new Error('no_image');
    const single = await buildIdPhoto({ uri: workUri, spec, zoom, offX: off.x, offY: off.y, background: showBgChips ? bg : undefined });
    return mode === 'sheet' ? buildIdSheet({ photoUri: single, spec, background: bg }) : single;
  };

  const save = async () => {
    if (!uri) return;
    setBusy(true);
    try {
      await saveToGallery(await render());
      haptics.success();
      toast({ variant: 'success', message: hi ? 'गैलरी में सहेजा गया' : 'Saved to gallery' });
    } catch {
      toast({ variant: 'error', message: hi ? 'सहेज नहीं सका' : "Couldn't save" });
    } finally {
      setBusy(false);
    }
  };
  const share = async () => {
    if (!uri) return;
    setBusy(true);
    try {
      await shareFiles([await render()], MIME.jpg);
    } catch {
      /* cancelled */
    } finally {
      setBusy(false);
    }
  };

  if (busy) return (<Screen center><LoadingState label={hi ? 'बना रहे हैं…' : 'Rendering…'} /></Screen>);

  return (
    <Screen padded={false} scroll={false}>
      <View style={styles.head}>
        <Header title={hi ? 'ID / पासपोर्ट फ़ोटो' : 'ID / Passport Photo'} onBack={() => navigation.goBack()} />
      </View>

      {!uri ? (
        <EmptyState
          icon={IdCard}
          title={hi ? 'ID फ़ोटो बनाएँ' : 'Make an ID photo'}
          subtitle={hi ? 'फ़ोटो चुनें, फिर चेहरा फ़्रेम में सेट करने के लिए खींचें व ज़ूम करें।' : 'Pick a photo, then drag & zoom to frame the face.'}
          actionLabel={hi ? 'फ़ोटो चुनें' : 'Select photo'}
          actionIcon={ImagePlus}
          onAction={pick}
        />
      ) : (
        <View style={styles.flex1}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View onLayout={onLayout} style={styles.previewOuter}>
              <GestureDetector gesture={pan}>
                <View style={[styles.frame, { width: frameW || '100%', height: frameH || 320, borderColor: theme.colors.brand, borderRadius: theme.radius.sm, backgroundColor: removeBg ? bg : theme.colors.surfaceSunken }]}>
                  {picture ? <Canvas style={StyleSheet.absoluteFill}><Picture picture={picture} /></Canvas> : <LoadingState />}
                </View>
              </GestureDetector>
            </View>
            <Text variant="caption" color="textSecondary" style={styles.hint}>
              {hi ? 'खींचें व ज़ूम करके फ़्रेम सेट करें' : 'Drag & zoom to frame'}
            </Text>

            <Slider label={hi ? 'ज़ूम' : 'Zoom'} value={zoom} min={1} max={3} onChange={setZoom} format={v => `${v.toFixed(1)}×`} />

            <Text variant="callout" style={styles.section}>{hi ? 'आउटपुट' : 'Output'}</Text>
            <View style={styles.chips}>
              {(['single', 'sheet'] as const).map(m => {
                const on = m === mode;
                return (
                  <Pressable key={m} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { haptics.light(); setMode(m); }}
                    style={[styles.chip, { backgroundColor: on ? theme.colors.brand : theme.colors.surfaceAlt, borderRadius: theme.radius.pill }]}>
                    <Text variant="caption" style={{ color: on ? theme.colors.onBrand : theme.colors.textSecondary }}>
                      {m === 'single' ? (hi ? 'एकल फ़ोटो' : 'Single photo') : (hi ? 'प्रिंट शीट (4×6)' : 'Print sheet (4×6)')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text variant="callout" style={styles.section}>{hi ? 'आकार' : 'Size'}</Text>
            <View style={styles.chips}>
              {ID_SPECS.map(s => {
                const on = s.key === spec.key;
                return (
                  <Pressable key={s.key} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { haptics.light(); setSpec(s); }}
                    style={[styles.chip, { backgroundColor: on ? theme.colors.brand : theme.colors.surfaceAlt, borderRadius: theme.radius.pill }]}>
                    <Text variant="caption" style={{ color: on ? theme.colors.onBrand : theme.colors.textSecondary }}>{s.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text variant="callout" style={styles.section}>{hi ? 'बैकग्राउंड' : 'Background'}</Text>
            <View style={styles.chips}>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: removeBg }} onPress={toggleBg}
                style={[styles.chip, { backgroundColor: removeBg ? theme.colors.brand : theme.colors.surfaceAlt, borderRadius: theme.radius.pill }]}>
                <Text variant="caption" style={{ color: removeBg ? theme.colors.onBrand : theme.colors.textSecondary }}>
                  {removeBg ? (hi ? 'बैकग्राउंड हटाया ✓' : 'Background removed ✓') : (hi ? 'बैकग्राउंड हटाएँ' : 'Remove background')}
                </Text>
              </Pressable>
            </View>

            {showBgChips && (
              <>
                <Text variant="callout" style={styles.section}>{hi ? 'बैकग्राउंड रंग' : 'Background colour'}</Text>
                <View style={styles.chips}>
                  {BACKGROUNDS.map(b => {
                    const on = b.color === bg;
                    return (
                      <Pressable key={b.key} accessibilityRole="button" accessibilityLabel={b.key} onPress={() => { haptics.light(); setBg(b.color); setCustomHex(''); }}
                        style={[styles.swatch, { backgroundColor: b.color, borderColor: on ? theme.colors.brand : theme.colors.border, borderWidth: on ? 3 : StyleSheet.hairlineWidth }]} />
                    );
                  })}
                </View>
                <Text variant="caption" color="textSecondary" style={styles.customLabel}>{hi ? 'कस्टम रंग कोड' : 'Custom colour code'}</Text>
                <View style={styles.customRow}>
                  <View style={[styles.customPreview, { backgroundColor: bg, borderColor: theme.colors.border }]} />
                  <View style={[styles.hexBox, { borderColor: theme.colors.border, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surfaceAlt }]}>
                    <Text variant="body" color="textSecondary">#</Text>
                    <TextInput
                      value={customHex}
                      onChangeText={applyCustom}
                      placeholder="RRGGBB"
                      placeholderTextColor={theme.colors.textTertiary}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      maxLength={6}
                      accessibilityLabel={hi ? 'कस्टम हेक्स रंग' : 'Custom hex colour'}
                      style={[styles.hexInput, { color: theme.colors.text }]}
                    />
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          <View style={[styles.actions, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
            <Button title={hi ? 'बदलें' : 'Change'} icon={ImagePlus} variant="secondary" style={styles.flex1} onPress={pick} />
            <Button title={hi ? 'सहेजें' : 'Save'} icon={Save} variant="secondary" style={[styles.flex1, styles.gap]} onPress={save} />
            <Button title={hi ? 'शेयर' : 'Share'} icon={Share2} style={[styles.flex1, styles.gap]} onPress={share} />
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 20 },
  flex1: { flex: 1 },
  gap: { marginLeft: 10 },
  scroll: { paddingHorizontal: 20, paddingBottom: 20 },
  previewOuter: { alignItems: 'center', marginTop: 8 },
  frame: { overflow: 'hidden', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  hint: { textAlign: 'center', marginTop: 8, marginBottom: 12 },
  section: { fontWeight: 'bold', marginBottom: 10, marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, minHeight: 40, justifyContent: 'center' },
  swatch: { width: 40, height: 40, borderRadius: 20 },
  customLabel: { marginBottom: 8 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  customPreview: { width: 40, height: 40, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  hexBox: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingHorizontal: 12, minHeight: 44, borderWidth: StyleSheet.hairlineWidth, gap: 2 },
  hexInput: { flex: 1, minHeight: 44, fontSize: 15, letterSpacing: 1 },
  actions: { flexDirection: 'row', padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
