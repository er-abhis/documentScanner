import { useEffect, useRef, useState } from 'react';
import {
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  AlertTriangle,
  ArrowRight,
  ImagePlus,
  Lock,
  RefreshCw,
  Save,
  Share2,
  Trash2,
  Unlock,
} from 'lucide-react-native';
import RNFS from 'react-native-fs';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { Slider } from '../components/Slider';
import { EmptyState } from '../components/EmptyState';
import { IconButton } from '../components/IconButton';
import { Sheet } from '../components/Sheet';
import { useToast } from '../components/Toast';
import { pickImages } from '../services/gallery';
import { saveToGallery } from '../services/gallery/save';
import { MIME, type ImgFormat } from '../services/image/encode';
import { computeOutputDims, processToImage, type ResizeRatio } from '../services/image/resize';
import { shareFiles } from '../services/sharing';
import { haptics } from '../lib/haptics';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FORMATS: { key: ImgFormat; label: string }[] = [
  { key: 'jpg', label: 'JPG' },
  { key: 'png', label: 'PNG' },
  { key: 'webp', label: 'WEBP' },
];

const RATIOS: ResizeRatio[] = ['original', '1:1', '4:3', '3:4', '16:9', '9:16'];

const RATIO_AR: Record<Exclude<ResizeRatio, 'original'>, number> = {
  '1:1': 1,
  '4:3': 4 / 3,
  '3:4': 3 / 4,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
};

interface ImageMetadata {
  uri: string;
  name: string;
  size: number;
  w: number;
  h: number;
}

type SheetMode = 'confirm' | 'progress' | 'error';
type ProcResult = { uri: string; bytes: number };

const strip = (u: string) => u.replace(/^file:\/\//, '');

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

/** Rough pre-encode size guess. Clearly labelled "~" in the UI — never exact. */
const estimateSize = (origSize: number, origW: number, origH: number, newW: number, newH: number, fmt: ImgFormat, q: number) => {
  const origArea = origW * origH || 1;
  const areaRatio = (newW * newH) / origArea;
  const formatFactor = fmt === 'png' ? 1.8 : fmt === 'webp' ? 0.55 : 0.85;
  const qualityFactor = fmt === 'png' ? 1 : q;
  return Math.max(1024, Math.round(origSize * areaRatio * qualityFactor * formatFactor));
};

async function copyToLocalCache(uri: string): Promise<string> {
  if (uri.startsWith('content://')) {
    const dest = `${RNFS.CachesDirectoryPath}/temp_conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
    await RNFS.copyFile(uri, dest);
    return `file://${dest}`;
  }
  return uri;
}

export function ConvertScreen({ navigation }: RootScreenProps<'Convert'>) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const { width: W, height: H } = useWindowDimensions();
  const toast = useToast();
  const hi = lang === 'hi';

  const [sources, setSources] = useState<string[]>([]);
  const [metadataList, setMetadataList] = useState<ImageMetadata[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [format, setFormat] = useState<ImgFormat>('jpg');
  const [quality, setQuality] = useState(0.9);
  const [scale, setScale] = useState(1);
  const [ratio, setRatio] = useState<ResizeRatio>('original');
  const [custom, setCustom] = useState(false);
  const [customW, setCustomW] = useState('');
  const [customH, setCustomH] = useState('');
  const [lockAspect, setLockAspect] = useState(true);
  const [measured, setMeasured] = useState<number | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const measureSeq = useRef(0);
  const [picking, setPicking] = useState(false);

  // one sheet drives confirm → progress → success/error
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>('confirm');
  const [actionType, setActionType] = useState<'save' | 'share'>('save');
  const [stage, setStage] = useState<'prepare' | 'convert' | 'save'>('prepare');
  const [doneCount, setDoneCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const anim = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

  const resolveMetadata = async (uris: string[]): Promise<ImageMetadata[]> => {
    const out: ImageMetadata[] = [];
    for (const uri of uris) {
      let local = uri;
      let temp = false;
      if (uri.startsWith('content://')) {
        try {
          local = await copyToLocalCache(uri);
          temp = true;
        } catch (e) {
          console.warn('copy content uri failed:', e);
        }
      }
      try {
        const stat = await RNFS.stat(strip(local));
        const name = uri.split('/').pop() || 'image.jpg';
        await new Promise<void>(resolve => {
          Image.getSize(
            local,
            (w, h) => {
              out.push({ uri, name, size: Number(stat.size) || 0, w, h });
              resolve();
            },
            () => {
              out.push({ uri, name, size: Number(stat.size) || 0, w: 0, h: 0 });
              resolve();
            },
          );
        });
      } catch (e) {
        console.warn('stat failed:', e);
      } finally {
        if (temp) {
          try {
            await RNFS.unlink(strip(local));
          } catch {}
        }
      }
    }
    return out;
  };

  const pick = async () => {
    const uris = await pickImages();
    if (!uris.length) return;
    setPicking(true);
    try {
      const meta = await resolveMetadata(uris);
      anim();
      setSources(prev => [...prev, ...uris]);
      setMetadataList(prev => [...prev, ...meta]);
    } catch (e) {
      console.warn('pick error:', e);
    } finally {
      setPicking(false);
    }
  };

  const clearAll = () => {
    anim();
    setSources([]);
    setMetadataList([]);
    setActiveIndex(0);
  };

  const removeImage = (index: number) => {
    anim();
    setSources(prev => prev.filter((_, i) => i !== index));
    setMetadataList(prev => prev.filter((_, i) => i !== index));
    setActiveIndex(i => Math.max(0, i >= index ? i - 1 : i));
  };

  const activeUri = sources[activeIndex];
  const activeMeta = metadataList[activeIndex];

  const nW = parseInt(customW, 10);
  const nH = parseInt(customH, 10);
  const targetDims = custom && nW > 0 && nH > 0 ? { w: nW, h: nH } : undefined;

  const out = activeMeta
    ? computeOutputDims(activeMeta.w || 1, activeMeta.h || 1, ratio, scale, targetDims)
    : { w: 0, h: 0 };
  const estSize = activeMeta ? estimateSize(activeMeta.size, activeMeta.w, activeMeta.h, out.w, out.h, format, quality) : 0;
  // Prefer a real measured size (debounced encode of the active image); fall
  // back to the rough estimate while measuring or on failure.
  const expSize = measured ?? estSize;

  const onCustomW = (v: string) => {
    const s = v.replace(/[^0-9]/g, '').slice(0, 5);
    setCustom(true);
    setCustomW(s);
    if (lockAspect && activeMeta && activeMeta.w && activeMeta.h) {
      const n = parseInt(s, 10);
      if (n > 0) setCustomH(String(Math.round(n * (activeMeta.h / activeMeta.w))));
    }
  };
  const onCustomH = (v: string) => {
    const s = v.replace(/[^0-9]/g, '').slice(0, 5);
    setCustom(true);
    setCustomH(s);
    if (lockAspect && activeMeta && activeMeta.w && activeMeta.h) {
      const n = parseInt(s, 10);
      if (n > 0) setCustomW(String(Math.round(n * (activeMeta.w / activeMeta.h))));
    }
  };

  // Debounced real encode of the active image -> exact output byte size.
  useEffect(() => {
    if (!activeUri || !activeMeta) { setMeasured(null); return; }
    const seq = ++measureSeq.current;
    setMeasuring(true);
    const id = setTimeout(async () => {
      let path = activeUri;
      let temp: string | null = null;
      try {
        if (path.startsWith('content://')) { path = await copyToLocalCache(path); temp = strip(path); }
        const r = await processToImage(path, {
          scale, ratio, format, quality: Math.round(quality * 100), target: targetDims,
        });
        if (seq === measureSeq.current) setMeasured(r.bytes);
        try { await RNFS.unlink(strip(r.uri)); } catch {}
      } catch {
        if (seq === measureSeq.current) setMeasured(null);
      } finally {
        if (temp) { try { await RNFS.unlink(temp); } catch {} }
        if (seq === measureSeq.current) setMeasuring(false);
      }
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUri, activeMeta, format, quality, scale, ratio, custom, customW, customH]);

  const curExt = activeMeta ? (activeMeta.name.split('.').pop() || '').toUpperCase() : '';
  const baseName = activeMeta ? activeMeta.name.replace(/\.[^/.]+$/, '') : '';
  const outName = `${baseName}.${format}`;

  // --- responsive, aspect-correct preview frame (no fixed dims) ---
  const containerAr = targetDims
    ? targetDims.w / targetDims.h
    : ratio === 'original'
      ? activeMeta && activeMeta.w && activeMeta.h
        ? activeMeta.w / activeMeta.h
        : 4 / 3
      : RATIO_AR[ratio];
  const cardW = W - 40;
  const cardH = Math.max(220, Math.min(Math.round(H * 0.4), Math.round(cardW * 1.1)));
  const innerMaxW = cardW - 24;
  const innerMaxH = cardH - 24;
  let frameW = innerMaxW;
  let frameH = frameW / containerAr;
  if (frameH > innerMaxH) {
    frameH = innerMaxH;
    frameW = frameH * containerAr;
  }

  const openExport = (type: 'save' | 'share') => {
    if (!sources.length) return;
    haptics.light();
    setActionType(type);
    setSheetMode('confirm');
    setSheetVisible(true);
  };

  const convertAll = async (onStep: (i: number, st: 'prepare' | 'convert' | 'save') => void): Promise<ProcResult[]> => {
    const results: ProcResult[] = [];
    const temps: string[] = [];
    try {
      for (let i = 0; i < sources.length; i++) {
        onStep(i, 'prepare');
        let path = sources[i];
        if (path.startsWith('content://')) {
          path = await copyToLocalCache(path);
          temps.push(strip(path));
        }
        onStep(i, 'convert');
        const r = await processToImage(path, {
          scale,
          ratio,
          format,
          quality: Math.round(quality * 100),
          target: targetDims,
        });
        results.push({ uri: r.uri, bytes: r.bytes });
      }
    } finally {
      for (const tp of temps) {
        try {
          await RNFS.unlink(tp);
        } catch {}
      }
    }
    return results;
  };

  const runExport = async () => {
    setSheetMode('progress');
    setStage('prepare');
    setDoneCount(0);
    try {
      const results = await convertAll((i, st) => {
        setDoneCount(i);
        setStage(st);
      });
      if (!results.length) throw new Error('no_output');
      const bytes = results.reduce((s, r) => s + r.bytes, 0);
      const n = results.length;

      if (actionType === 'save') {
        setStage('save');
        setDoneCount(sources.length);
        for (const r of results) await saveToGallery(r.uri);
        setSheetVisible(false);
        haptics.success();
        toast({
          variant: 'success',
          message: hi
            ? `${n > 1 ? `${n} इमेज ` : ''}गैलरी में सहेजी गई · ${formatSize(bytes)}`
            : `${n > 1 ? `${n} images ` : ''}saved to gallery · ${formatSize(bytes)}`,
        });
      } else {
        setSheetVisible(false);
        await shareFiles(results.map(r => r.uri), MIME[format]);
        haptics.success();
        toast({ variant: 'success', message: hi ? 'शेयर किया गया' : `Shared as ${format.toUpperCase()}` });
      }
    } catch (e) {
      console.warn('Export failed:', e);
      haptics.warning();
      setErrorMsg((e as { message?: string })?.message ?? String(e));
      setSheetMode('error');
    }
  };

  const stageLabel =
    stage === 'prepare'
      ? hi ? 'इमेज तैयार हो रही है…' : 'Preparing image…'
      : stage === 'convert'
        ? hi ? `${format.toUpperCase()} में बदल रहा है…` : `Converting to ${format.toUpperCase()}…`
        : hi ? 'सहेजा जा रहा है…' : 'Saving…';

  return (
    <Screen padded={false} scroll={false}>
      <View style={styles.head}>
        <Header
          title={t('convert.title')}
          onBack={() => navigation.goBack()}
          right={sources.length > 0 ? <IconButton icon={Trash2} onPress={clearAll} accessibilityLabel={hi ? 'सभी हटाएँ' : 'Clear all'} /> : undefined}
        />
      </View>

      {sources.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title={t('convert.emptyTitle')}
          subtitle={t('convert.emptySub')}
          actionLabel={picking ? (hi ? 'लोड हो रहा है…' : 'Loading…') : t('convert.selectImages')}
          actionIcon={ImagePlus}
          onAction={pick}
        />
      ) : (
        <View style={styles.flex1}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* multi-image strip */}
            {sources.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
                {sources.map((uri, index) => {
                  const on = index === activeIndex;
                  return (
                    <View key={`${uri}-${index}`} style={styles.thumbWrap}>
                      <Pressable
                        accessibilityRole="imagebutton"
                        accessibilityLabel={`${hi ? 'इमेज' : 'Image'} ${index + 1}`}
                        onPress={() => {
                          anim();
                          setActiveIndex(index);
                        }}
                        style={[styles.thumbBox, { borderColor: on ? theme.colors.brand : theme.colors.border, borderWidth: on ? 2 : 1, borderRadius: theme.radius.sm }]}
                      >
                        <Image source={{ uri }} style={styles.thumbImg} />
                      </Pressable>
                      <Pressable onPress={() => removeImage(index)} accessibilityLabel={hi ? 'हटाएँ' : 'Remove'} style={[styles.thumbX, { backgroundColor: theme.colors.danger }]}>
                        <Text style={styles.thumbXText}>×</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {/* preview card */}
            <View style={[styles.previewCard, { width: cardW, height: cardH, backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border, borderRadius: theme.radius.lg }, theme.elevation(1)]}>
              {activeUri && (
                <Animated.View
                  key={`${activeUri}-${ratio}-${scale}-${format}`}
                  entering={FadeIn.duration(220)}
                  style={[styles.frame, { width: frameW, height: frameH, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceSunken }]}
                >
                  <Image source={{ uri: activeUri }} style={styles.frameImg} resizeMode={ratio === 'original' ? 'contain' : 'cover'} />
                </Animated.View>
              )}
            </View>

            {/* source info */}
            {activeMeta && (
              <View style={styles.infoBlock}>
                <Text variant="bodyStrong" numberOfLines={1}>📷 {activeMeta.name}</Text>
                <Text variant="caption" color="textSecondary" style={styles.infoLine}>
                  {activeMeta.w} × {activeMeta.h} · {formatSize(activeMeta.size)} · {curExt || format.toUpperCase()}
                </Text>
              </View>
            )}

            {/* current → output */}
            {activeMeta && (
              <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md }]}>
                <View style={styles.ioRow}>
                  <View style={styles.ioCol}>
                    <Text variant="caption" color="textTertiary">{hi ? 'वर्तमान' : 'Current'}</Text>
                    <Text variant="callout" numberOfLines={1} style={styles.ioName}>{activeMeta.name}</Text>
                    <Text variant="caption" color="textSecondary">{curExt || format.toUpperCase()} · {activeMeta.w}×{activeMeta.h}</Text>
                    <Text variant="caption" color="textSecondary">{formatSize(activeMeta.size)}</Text>
                  </View>
                  <ArrowRight size={18} color={theme.colors.textTertiary} style={styles.ioArrow} />
                  <View style={styles.ioCol}>
                    <Text variant="caption" color="brand">{hi ? 'आउटपुट' : 'Output'}</Text>
                    <Text variant="callout" numberOfLines={1} style={[styles.ioName, { color: theme.colors.brand }]}>{outName}</Text>
                    <Text variant="caption" style={{ color: theme.colors.brand }}>{format.toUpperCase()} · {out.w}×{out.h}</Text>
                    <Text variant="caption" color="textSecondary">
                      {measuring
                        ? (hi ? 'माप रहे हैं…' : 'Measuring…')
                        : measured != null
                          ? `${formatSize(measured)} · ${hi ? 'सटीक' : 'Exact'}`
                          : `~${formatSize(expSize)} · ${hi ? 'अनुमानित' : 'Estimated'}`}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* controls */}
            <View style={styles.panel}>
              <Text variant="callout" style={styles.sectionTitle}>{hi ? 'आउटपुट फ़ॉर्मेट' : 'Output Format'}</Text>
              <View style={styles.chips}>
                {FORMATS.map(f => {
                  const on = f.key === format;
                  return (
                    <Pressable
                      key={f.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={f.label}
                      onPress={() => {
                        anim();
                        haptics.light();
                        setFormat(f.key);
                      }}
                      style={[styles.chip, { backgroundColor: on ? theme.colors.brand : theme.colors.surfaceAlt, borderRadius: theme.radius.pill }]}
                    >
                      <Text variant="callout" style={{ color: on ? theme.colors.onBrand : theme.colors.textSecondary }}>{f.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text variant="callout" style={styles.sectionTitle}>{t('convert.resize')}</Text>
              <View style={styles.chips}>
                {RATIOS.map(r => {
                  const on = r === ratio;
                  return (
                    <Pressable
                      key={r}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={r === 'original' ? t('convert.original') : r}
                      onPress={() => {
                        anim();
                        haptics.light();
                        setRatio(r);
                        setCustom(false);
                      }}
                      style={[styles.chipSm, { backgroundColor: on && !custom ? theme.colors.brand : theme.colors.surfaceAlt, borderRadius: theme.radius.pill }]}
                    >
                      <Text variant="caption" style={{ color: on && !custom ? theme.colors.onBrand : theme.colors.textSecondary }}>{r === 'original' ? t('convert.original') : r}</Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: custom }}
                  accessibilityLabel={hi ? 'कस्टम आकार' : 'Custom size'}
                  onPress={() => {
                    anim();
                    haptics.light();
                    setCustom(true);
                    if (!customW && activeMeta) { setCustomW(String(activeMeta.w)); setCustomH(String(activeMeta.h)); }
                  }}
                  style={[styles.chipSm, { backgroundColor: custom ? theme.colors.brand : theme.colors.surfaceAlt, borderRadius: theme.radius.pill }]}
                >
                  <Text variant="caption" style={{ color: custom ? theme.colors.onBrand : theme.colors.textSecondary }}>{hi ? 'कस्टम' : 'Custom'}</Text>
                </Pressable>
              </View>

              {custom && (
                <View style={styles.customRow}>
                  <TextInput
                    value={customW}
                    onChangeText={onCustomW}
                    keyboardType="number-pad"
                    placeholder={hi ? 'चौड़ाई' : 'Width'}
                    placeholderTextColor={theme.colors.textTertiary}
                    accessibilityLabel={hi ? 'चौड़ाई पिक्सेल' : 'Width in pixels'}
                    style={[styles.dimInput, { color: theme.colors.text, backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border, borderRadius: theme.radius.sm }]}
                  />
                  <Text variant="body" color="textTertiary">×</Text>
                  <TextInput
                    value={customH}
                    onChangeText={onCustomH}
                    keyboardType="number-pad"
                    placeholder={hi ? 'ऊँचाई' : 'Height'}
                    placeholderTextColor={theme.colors.textTertiary}
                    accessibilityLabel={hi ? 'ऊँचाई पिक्सेल' : 'Height in pixels'}
                    style={[styles.dimInput, { color: theme.colors.text, backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border, borderRadius: theme.radius.sm }]}
                  />
                  <Text variant="caption" color="textTertiary">px</Text>
                  <IconButton
                    icon={lockAspect ? Lock : Unlock}
                    variant="surface"
                    color={lockAspect ? theme.colors.brand : theme.colors.textSecondary}
                    onPress={() => { haptics.light(); setLockAspect(v => !v); }}
                    accessibilityLabel={hi ? 'आस्पेक्ट रेशियो लॉक' : 'Lock aspect ratio'}
                  />
                </View>
              )}
              <Text variant="caption" color="textSecondary" style={styles.hint}>
                {activeMeta ? `${activeMeta.w}×${activeMeta.h} → ${out.w}×${out.h}${ratio === 'original' ? '' : ` (${ratio})`}` : ''}
              </Text>

              <Text variant="callout" style={styles.sectionTitle}>{t('convert.scale')}</Text>
              <View style={styles.chips}>
                {[0.25, 0.5, 0.75, 1].map(p => {
                  const on = Math.abs(scale - p) < 0.001;
                  return (
                    <Pressable
                      key={p}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`${Math.round(p * 100)} percent`}
                      onPress={() => {
                        anim();
                        haptics.light();
                        setScale(p);
                        setCustom(false);
                      }}
                      style={[styles.chipSm, { backgroundColor: on && !custom ? theme.colors.brand : theme.colors.surfaceAlt, borderRadius: theme.radius.pill }]}
                    >
                      <Text variant="caption" style={{ color: on && !custom ? theme.colors.onBrand : theme.colors.textSecondary }}>{Math.round(p * 100)}%</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Slider label={t('convert.scale')} value={scale} min={0.1} max={1} onChange={v => { setScale(v); setCustom(false); }} format={v => `${Math.round(v * 100)}% → ${out.w}×${out.h}`} />

              {format === 'png' ? (
                <Text variant="caption" color="textSecondary" style={styles.hint}>
                  {hi ? 'PNG लॉसलेस है — JPEG जैसी क्वालिटी लागू नहीं होती।' : 'PNG is lossless — JPEG-style quality does not apply.'}
                </Text>
              ) : (
                <Slider label={t('convert.quality')} value={quality} min={0.3} max={1} onChange={setQuality} format={v => `${Math.round(v * 100)}%`} />
              )}
            </View>
          </ScrollView>

          {/* bottom action bar (Screen handles bottom safe area) */}
          <View style={[styles.actions, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
            <Button title={t('common.add')} icon={ImagePlus} variant="secondary" style={styles.flex1} onPress={pick} />
            <Button title={t('common.save')} icon={Save} variant="secondary" style={[styles.flex1, styles.gap]} onPress={() => openExport('save')} />
            <Button title={t('common.share')} icon={Share2} style={[styles.flex1, styles.gap]} onPress={() => openExport('share')} />
          </View>
        </View>
      )}

      {/* unified premium sheet: confirm → progress → success / error */}
      <Sheet visible={sheetVisible} onClose={() => setSheetVisible(false)} dismissable={sheetMode !== 'progress'}>
        {sheetMode === 'confirm' && activeMeta && (
          <View>
            <Text variant="h2" style={styles.sheetTitle}>{actionType === 'save' ? (hi ? 'बदलें और सहेजें' : 'Convert & Save') : (hi ? 'बदलें और शेयर करें' : 'Convert & Share')}</Text>
            <InfoRow label={hi ? 'मूल' : 'Original'} value={`${activeMeta.name}`} theme={theme} />
            <InfoRow label={hi ? 'फ़ॉर्मेट' : 'Format'} value={`${curExt || format.toUpperCase()} → ${format.toUpperCase()}`} theme={theme} />
            <InfoRow label={hi ? 'आयाम' : 'Dimensions'} value={`${activeMeta.w}×${activeMeta.h} → ${out.w}×${out.h}`} theme={theme} />
            <InfoRow label={hi ? 'गुणवत्ता' : 'Quality'} value={format === 'png' ? (hi ? 'लॉसलेस' : 'Lossless') : `${Math.round(quality * 100)}%`} theme={theme} />
            <InfoRow label={hi ? 'अनुमानित साइज' : 'Estimated size'} value={`~${formatSize(expSize * sources.length)}`} theme={theme} />
            {sources.length > 1 && <InfoRow label={hi ? 'इमेज' : 'Images'} value={`${sources.length}`} theme={theme} />}
            <View style={styles.sheetActions}>
              <Button title={t('common.cancel')} variant="secondary" style={styles.flex1} onPress={() => setSheetVisible(false)} />
              <Button title={actionType === 'save' ? t('common.save') : t('common.share')} style={[styles.flex1, styles.gap]} onPress={runExport} />
            </View>
          </View>
        )}

        {sheetMode === 'progress' && (
          <View style={styles.centerPad}>
            <SpinnerDots theme={theme} />
            <Text variant="bodyStrong" style={styles.progressLabel}>{stageLabel}</Text>
            {sources.length > 1 && (
              <Text variant="caption" color="textSecondary">{Math.min(doneCount + 1, sources.length)} / {sources.length}</Text>
            )}
          </View>
        )}

        {sheetMode === 'error' && (
          <View style={styles.centerPad}>
            <AlertTriangle size={44} color={theme.colors.danger} />
            <Text variant="h2" style={styles.successTitle}>{hi ? 'इमेज नहीं बदल सका' : "Couldn't convert image"}</Text>
            <Text variant="caption" color="textSecondary" style={styles.errText} numberOfLines={3}>{errorMsg}</Text>
            <View style={styles.sheetActions}>
              <Button title={t('common.cancel')} variant="secondary" style={styles.flex1} onPress={() => setSheetVisible(false)} />
              <Button title={t('common.retry')} style={[styles.flex1, styles.gap]} onPress={runExport} />
            </View>
          </View>
        )}
      </Sheet>
    </Screen>
  );
}

function InfoRow({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={[styles.detailRow, { borderBottomColor: theme.colors.border }]}>
      <Text variant="caption" color="textSecondary">{label}</Text>
      <Text variant="callout" numberOfLines={1} style={styles.detailVal}>{value}</Text>
    </View>
  );
}

/** Three pulsing dots — light, on-brand progress affordance. */
function SpinnerDots({ theme }: { theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.dots}>
      {[0, 1, 2].map(i => (
        <Animated.View
          key={i}
          entering={FadeIn.delay(i * 120).duration(300)}
          style={[styles.dot, { backgroundColor: theme.colors.brand }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 20 },
  flex1: { flex: 1 },
  gap: { marginLeft: 10 },
  scroll: { paddingHorizontal: 20, paddingBottom: 20 },

  strip: { gap: 10, paddingVertical: 8 },
  thumbWrap: { position: 'relative' },
  thumbBox: { width: 56, height: 56, overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  thumbX: { position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  thumbXText: { color: '#fff', fontSize: 12, fontWeight: 'bold', lineHeight: 14 },

  previewCard: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderWidth: 1, overflow: 'hidden', marginTop: 4, marginBottom: 14 },
  frame: { overflow: 'hidden' },
  frameImg: { width: '100%', height: '100%' },

  infoBlock: { marginBottom: 14 },
  infoLine: { marginTop: 3 },

  card: { padding: 14, borderWidth: 1, marginBottom: 18 },
  ioRow: { flexDirection: 'row', alignItems: 'center' },
  ioCol: { flex: 1 },
  ioName: { fontWeight: '600', marginTop: 2, marginBottom: 2 },
  ioArrow: { marginHorizontal: 10 },

  panel: {},
  sectionTitle: { fontWeight: 'bold', marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 20, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  chipSm: { paddingHorizontal: 14, paddingVertical: 9, minHeight: 40, justifyContent: 'center' },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 8 },
  dimInput: { flex: 1, minHeight: 44, paddingHorizontal: 12, borderWidth: StyleSheet.hairlineWidth, fontSize: 15, textAlign: 'center' },
  hint: { marginBottom: 16 },

  actions: { flexDirection: 'row', padding: 16, borderTopWidth: StyleSheet.hairlineWidth },

  sheetTitle: { marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  detailVal: { fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  sheetActions: { flexDirection: 'row', marginTop: 20 },

  centerPad: { alignItems: 'center', paddingVertical: 12 },
  progressLabel: { marginTop: 18, marginBottom: 6 },
  successTitle: { marginTop: 14, marginBottom: 6, textAlign: 'center' },
  errText: { textAlign: 'center', marginTop: 4, marginBottom: 4 },
  dots: { flexDirection: 'row', gap: 10, marginTop: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
