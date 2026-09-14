import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, type LayoutChangeEvent } from 'react-native';
import { Canvas, Picture, Skia, createPicture, useImage } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import {
  Check,
  Eraser,
  IdCard,
  ImagePlus,
  LayoutGrid,
  Move,
  Palette,
  Ruler,
  Save,
  Scissors,
  Share2,
  User,
  ZoomIn,
  type LucideIcon,
} from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Slider } from '../components/Slider';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { useToast } from '../components/Toast';
import { pickImages } from '../services/gallery';
import { saveToGallery } from '../services/gallery/save';
import { shareFiles } from '../services/sharing';
import { buildIdPhoto, buildIdSheet, computeCrop, sheetGrid, specPx, ID_SPECS, type IdSpec } from '../services/image/idphoto';
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

// Pick a legible check colour for a swatch based on its perceived brightness.
const isLightColor = (hex: string) => {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return true;
  const n = parseInt(m[1], 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150;
};

/** Uppercase eyebrow + icon that opens each option group. */
function SectionHeader({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHead}>
      <Icon size={15} color={theme.colors.textSecondary} />
      <Text variant="label" color="textSecondary">{title}</Text>
    </View>
  );
}

/** Compact on/off switch (no native dep). */
function Toggle({ on }: { on: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.switchTrack, { backgroundColor: on ? theme.colors.brand : theme.colors.surfaceSunken, borderColor: on ? theme.colors.brand : theme.colors.borderStrong }]}>
      <View style={[styles.switchKnob, { alignSelf: on ? 'flex-end' : 'flex-start', backgroundColor: on ? theme.colors.onBrand : theme.colors.surface }]} />
    </View>
  );
}

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
  const [cutLines, setCutLines] = useState(true);

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
  const perSheet = useMemo(() => sheetGrid(spec).count, [spec]);

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
    return mode === 'sheet' ? buildIdSheet({ photoUri: single, spec, background: bg, cutLines }) : single;
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

  const outputs = [
    { key: 'single' as const, icon: User, label: hi ? 'एकल फ़ोटो' : 'Single', sub: hi ? '1 फ़ोटो' : '1 photo' },
    { key: 'sheet' as const, icon: LayoutGrid, label: hi ? 'प्रिंट शीट' : 'Print sheet', sub: hi ? `4×6 पर ${perSheet}` : `${perSheet} on 4×6` },
  ];

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
                <View style={[styles.frame, { width: frameW || '100%', height: frameH || 320, borderColor: theme.colors.brand, borderRadius: theme.radius.md, backgroundColor: removeBg ? bg : theme.colors.surfaceSunken }, theme.elevation(2)]}>
                  {picture ? <Canvas style={StyleSheet.absoluteFill}><Picture picture={picture} /></Canvas> : <LoadingState />}
                </View>
              </GestureDetector>
              <View style={[styles.hintPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Move size={13} color={theme.colors.textSecondary} />
                <Text variant="caption" color="textSecondary">{hi ? 'खींचें व ज़ूम करके फ़्रेम सेट करें' : 'Drag & zoom to frame'}</Text>
              </View>
            </View>

            <Card style={styles.card}>
              <Slider icon={ZoomIn} label={hi ? 'ज़ूम' : 'Zoom'} value={zoom} min={1} max={3} onChange={setZoom} format={v => `${v.toFixed(1)}×`} />
            </Card>

            <Card style={styles.card}>
              <SectionHeader icon={LayoutGrid} title={hi ? 'आउटपुट' : 'OUTPUT'} />
              <View style={[styles.segment, { backgroundColor: theme.colors.surfaceSunken }]}>
                {outputs.map(o => {
                  const on = o.key === mode;
                  const Icon = o.icon;
                  return (
                    <Pressable key={o.key} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { haptics.light(); setMode(o.key); }}
                      style={[styles.segItem, { borderRadius: theme.radius.sm }, on && [{ backgroundColor: theme.colors.surface }, theme.elevation(1)]]}>
                      <Icon size={18} color={on ? theme.colors.brand : theme.colors.textSecondary} />
                      <View>
                        <Text variant="callout" style={{ color: on ? theme.colors.text : theme.colors.textSecondary, fontWeight: on ? '700' : '500' }}>{o.label}</Text>
                        <Text variant="caption" color="textTertiary">{o.sub}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {mode === 'sheet' && (
                <Pressable accessibilityRole="switch" accessibilityState={{ checked: cutLines }} onPress={() => { haptics.light(); setCutLines(v => !v); }} style={styles.toggleRow}>
                  <View style={[styles.toggleIcon, { backgroundColor: theme.colors.surfaceAlt }]}>
                    <Scissors size={18} color={theme.colors.textSecondary} />
                  </View>
                  <View style={styles.flex1}>
                    <Text variant="bodyStrong">{hi ? 'कटिंग गाइड' : 'Cutting guides'}</Text>
                    <Text variant="caption" color="textTertiary">{hi ? 'काटने के लिए पतली बॉर्डर लाइनें' : 'Thin borders to cut along'}</Text>
                  </View>
                  <Toggle on={cutLines} />
                </Pressable>
              )}
            </Card>

            <Card style={styles.card}>
              <SectionHeader icon={Ruler} title={hi ? 'आकार' : 'SIZE'} />
              <View style={styles.grid}>
                {ID_SPECS.map(s => {
                  const on = s.key === spec.key;
                  const sp = specPx(s);
                  return (
                    <Pressable key={s.key} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { haptics.light(); setSpec(s); }}
                      style={[styles.tile, { borderRadius: theme.radius.md, borderColor: on ? theme.colors.brand : theme.colors.border, backgroundColor: on ? theme.colors.brandSubtle : theme.colors.surfaceAlt, borderWidth: on ? 2 : StyleSheet.hairlineWidth }]}>
                      <Text variant="bodyStrong" style={{ color: on ? theme.colors.brand : theme.colors.text }} numberOfLines={1}>{s.label}</Text>
                      <Text variant="caption" color="textTertiary">{sp.w} × {sp.h} px · 300 DPI</Text>
                      {on && <View style={[styles.tileCheck, { backgroundColor: theme.colors.brand }]}><Check size={12} color={theme.colors.onBrand} strokeWidth={3} /></View>}
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            <Card style={styles.card}>
              <SectionHeader icon={Palette} title={hi ? 'बैकग्राउंड' : 'BACKGROUND'} />
              <Pressable accessibilityRole="switch" accessibilityState={{ checked: removeBg }} onPress={toggleBg} style={styles.toggleRow}>
                <View style={[styles.toggleIcon, { backgroundColor: removeBg ? theme.colors.brandSubtle : theme.colors.surfaceAlt }]}>
                  <Eraser size={18} color={removeBg ? theme.colors.brand : theme.colors.textSecondary} />
                </View>
                <View style={styles.flex1}>
                  <Text variant="bodyStrong">{hi ? 'बैकग्राउंड हटाएँ' : 'Remove background'}</Text>
                  <Text variant="caption" color="textTertiary">
                    {!bgRemovalAvailable ? (hi ? 'ऐप रीबिल्ड करने पर उपलब्ध' : 'Available after app rebuild')
                      : removeBg ? (hi ? 'नीचे रंग चुनें' : 'Pick a colour below')
                      : (hi ? 'सब्जेक्ट काटकर रंग लगाएँ' : 'Cut out subject, add a colour')}
                  </Text>
                </View>
                <Toggle on={removeBg} />
              </Pressable>

              {showBgChips && (
                <View style={[styles.bgSection, { borderTopColor: theme.colors.border }]}>
                  <View style={styles.swatchRow}>
                    {BACKGROUNDS.map(b => {
                      const on = b.color === bg;
                      return (
                        <Pressable key={b.key} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={b.key} onPress={() => { haptics.light(); setBg(b.color); setCustomHex(''); }}
                          style={[styles.swatch, { backgroundColor: b.color, borderColor: on ? theme.colors.brand : theme.colors.border, borderWidth: on ? 3 : StyleSheet.hairlineWidth }]}>
                          {on && <Check size={16} color={isLightColor(b.color) ? '#0B1220' : '#FFFFFF'} strokeWidth={3} />}
                        </Pressable>
                      );
                    })}
                  </View>
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
                </View>
              )}
            </Card>
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
  previewOuter: { alignItems: 'center', marginTop: 8, marginBottom: 16 },
  frame: { overflow: 'hidden', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  hintPill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  card: { marginBottom: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14 },
  segItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, minHeight: 52 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  toggleIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  switchTrack: { width: 46, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  switchKnob: { width: 20, height: 20, borderRadius: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  tile: { width: '48%', paddingHorizontal: 14, paddingVertical: 12, gap: 2 },
  tileCheck: { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  bgSection: { marginTop: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  swatch: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  customPreview: { width: 44, height: 44, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  hexBox: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingHorizontal: 12, minHeight: 44, borderWidth: StyleSheet.hairlineWidth, gap: 2 },
  hexInput: { flex: 1, minHeight: 44, fontSize: 15, letterSpacing: 1 },
  actions: { flexDirection: 'row', padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
