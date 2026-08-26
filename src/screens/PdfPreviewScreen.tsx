import React from 'react';
import { useRef, useState } from 'react';
import { Pressable, StatusBar, StyleSheet, TextInput, View } from 'react-native';
import Pdf from 'react-native-pdf';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import {
  Share2,
  Rows3,
  Columns3,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Pen,
  MoreHorizontal,
  Printer,
  Scissors,
  Images,
  FileDown,
  Save,
} from 'lucide-react-native';
import RNFS from 'react-native-fs';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { IconButton } from '../components/IconButton';
import { Slider } from '../components/Slider';
import { LoadingState } from '../components/LoadingState';
import { Button } from '../components/Button';
import { ActionSheet } from '../components/ActionSheet';
import { Sheet } from '../components/Sheet';
import { useToast } from '../components/Toast';
import { sharePdf } from '../services/sharing';
import { printPdf, splitPdfRange, pdfToImages, compressPdf } from '../services/pdf/tools';
import { saveToGallery } from '../services/gallery/save';
import { savePdfDocument } from '../services/storage';
import { useDeferredMount } from '../hooks/useDeferredMount';
import { useT } from '../i18n';
import { haptics } from '../lib/haptics';
import { HIT_SLOP, useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

const strip = (u: string) => u.replace(/^file:\/\//, '');
const fmtBytes = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`);
const COMPRESS: Record<'high' | 'medium' | 'low', { scale: number; quality: number }> = {
  high: { scale: 1.0, quality: 45 },
  medium: { scale: 1.4, quality: 60 },
  low: { scale: 2.0, quality: 78 },
};

// fitPolicy: 0 = fit width, 2 = fit whole page
const FIT_WIDTH = 0 as const;
const FIT_PAGE = 2 as const;
type Fit = typeof FIT_WIDTH | typeof FIT_PAGE;

export function PdfPreviewScreen({ route, navigation }: RootScreenProps<'PdfPreview'>) {
  const theme = useTheme();
  const t = useT();
  const { uri, name, editable } = route.params;
  // Mount the native PDF view only after the push animation completes.
  const ready = useDeferredMount();
  const pdfRef = useRef<React.ComponentRef<typeof Pdf>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [horizontal, setHorizontal] = useState(false);
  const [fit, setFit] = useState<Fit>(FIT_WIDTH);
  const [immersive, setImmersive] = useState(false);
  const toast = useToast();

  // --- PDF tools (print / split / images / compress) ---
  const baseName = name.replace(/\.[^/.]+$/, '');
  const [menu, setMenu] = useState(false);
  const [op, setOp] = useState<null | 'split' | 'compress' | 'images'>(null);
  const [busy, setBusy] = useState(false);
  const [from, setFrom] = useState('1');
  const [to, setTo] = useState('1');
  const [level, setLevel] = useState<'high' | 'medium' | 'low'>('medium');
  const [origBytes, setOrigBytes] = useState(0);
  const [result, setResult] = useState<{ uri: string; bytes: number } | null>(null);

  const err = (e: unknown) => {
    console.warn('pdf tool failed:', e);
    haptics.warning();
    toast({ variant: 'error', message: t('pdfPreview.opFail') });
  };

  const doPrint = async () => {
    try { await printPdf(uri); } catch (e) { err(e); }
  };

  const openOp = async (o: 'split' | 'compress' | 'images') => {
    setResult(null);
    setBusy(false);
    if (o === 'split') { setFrom('1'); setTo(String(total || 1)); }
    if (o === 'compress') {
      try { setOrigBytes(Number((await RNFS.stat(strip(uri))).size) || 0); } catch { setOrigBytes(0); }
    }
    setOp(o);
    if (o === 'images') runImages();
  };

  const runImages = async () => {
    setBusy(true);
    try {
      const imgs = await pdfToImages(uri, 2);
      if (!imgs.length) throw new Error('no_pages');
      for (const u of imgs) await saveToGallery(u);
      haptics.success();
      toast({ variant: 'success', message: t('pdfPreview.imagesSaved').replace('{n}', String(imgs.length)) });
      setOp(null);
    } catch (e) { err(e); setOp(null); } finally { setBusy(false); }
  };

  const runSplit = async () => {
    const f = parseInt(from, 10), tt = parseInt(to, 10);
    if (!(f > 0) || !(tt >= f)) { toast({ variant: 'error', message: t('pdfPreview.rangeInvalid') }); return; }
    setBusy(true);
    try {
      const r = await splitPdfRange(uri, f, tt, baseName);
      haptics.success();
      setResult({ uri: r.uri, bytes: r.bytes });
    } catch (e) { err(e); } finally { setBusy(false); }
  };

  const runCompress = async () => {
    setBusy(true);
    try {
      const r = await compressPdf(uri, { ...COMPRESS[level], baseName });
      haptics.success();
      setResult({ uri: r.uri, bytes: r.bytes });
    } catch (e) { err(e); } finally { setBusy(false); }
  };

  const shareResult = async () => { if (result) await sharePdf(result.uri, `${baseName}.pdf`); };
  const saveResult = async () => {
    if (!result) return;
    try {
      await savePdfDocument(result.uri, op === 'split' ? `${baseName} (split)` : `${baseName} (compressed)`);
      haptics.success();
      toast({ variant: 'success', message: t('pdfPreview.savedToDocs') });
      setOp(null);
    } catch (e) { err(e); }
  };

  const openEditor = () => navigation.navigate('PdfTextEditor', { uri, name });

  const jump = (p: number) => {
    if (!Number.isFinite(p) || total < 1) return;
    const n = Math.min(Math.max(Math.round(p), 1), total);
    if (n !== page && Number.isFinite(n)) {
      pdfRef.current?.setPage(n);
      setPage(n);
    }
  };

  return (
    <Screen padded={false} edges={immersive ? [] : ['top', 'left', 'right', 'bottom']}>
      <StatusBar hidden={immersive} />

      {!immersive && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.head}>
          <Header
            title={name}
            onBack={() => navigation.goBack()}
            right={
              <View style={styles.headActions}>
                {editable && (
                  <IconButton icon={Pen} onPress={openEditor} accessibilityLabel={t('pdfPreview.editPdf')} color={theme.colors.brand} />
                )}
                <IconButton icon={Share2} onPress={() => sharePdf(uri, name)} accessibilityLabel={t('pdfPreview.sharePdf')} />
                <IconButton icon={MoreHorizontal} onPress={() => { haptics.light(); setMenu(true); }} accessibilityLabel={t('pdfPreview.more')} />
              </View>
            }
          />
        </Animated.View>
      )}

      <View style={[styles.body, { backgroundColor: theme.colors.surfaceSunken }]}>
        {error ? (
          <View style={styles.center}>
            <Text variant="body" color="textSecondary">
              {t('pdfPreview.openFail')}
            </Text>
          </View>
        ) : (
          <>
            {ready && (
            <Pdf
              ref={pdfRef}
              source={{ uri, cache: true }}
              horizontal={horizontal}
              enablePaging={horizontal}
              fitPolicy={fit}
              minScale={1}
              maxScale={4}
              spacing={horizontal ? 0 : 8}
              trustAllCerts={false}
              style={[styles.pdf, { backgroundColor: theme.colors.surfaceSunken }]}
              onLoadComplete={n => {
                setTotal(n);
                setLoading(false);
              }}
              onPageChanged={p => setPage(p)}
              onPageSingleTap={() => setImmersive(v => !v)}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
            />
            )}

            {(!ready || loading) && (
              <View style={styles.overlay}>
                <LoadingState label={t('pdfPreview.opening')} />
              </View>
            )}

            {/* floating page pill (always visible when loaded) */}
            {!loading && total > 0 && (
              <Animated.View
                entering={FadeIn}
                style={[styles.pill, { backgroundColor: '#000000B0' }]}
                pointerEvents="none"
              >
                <Text variant="caption" style={{ color: '#fff' }}>
                  {page} / {total}
                </Text>
              </Animated.View>
            )}
          </>
        )}
      </View>

      {/* control bar */}
      {!immersive && !loading && !error && total > 0 && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={[styles.bar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}
        >
          <View style={styles.jumpRow}>
            <IconButton
              icon={ChevronLeft}
              onPress={() => jump(page - 1)}
              disabled={page <= 1}
              accessibilityLabel={t('pdfPreview.prevPage')}
            />
            <View style={styles.slider}>
              <Slider
                label={t('pdfPreview.page')}
                value={page}
                min={1}
                max={Math.max(total, 1)}
                onChange={jump}
                format={() => `${page} / ${total}`}
              />
            </View>
            <IconButton
              icon={ChevronRight}
              onPress={() => jump(page + 1)}
              disabled={page >= total}
              accessibilityLabel={t('pdfPreview.nextPage')}
            />
          </View>

          <View style={styles.tools}>
            <Toggle
              active={horizontal}
              onPress={() => setHorizontal(v => !v)}
              icon={horizontal ? Columns3 : Rows3}
              label={horizontal ? t('pdfPreview.paged') : t('pdfPreview.scroll')}
            />
            <Toggle
              active={fit === FIT_PAGE}
              onPress={() => setFit(f => (f === FIT_WIDTH ? FIT_PAGE : FIT_WIDTH))}
              icon={fit === FIT_PAGE ? Minimize2 : Maximize2}
              label={fit === FIT_PAGE ? t('pdfPreview.fitPage') : t('pdfPreview.fitWidth')}
            />
          </View>
        </Animated.View>
      )}

      <ActionSheet
        visible={menu}
        title={name}
        onClose={() => setMenu(false)}
        actions={[
          { label: t('pdfPreview.print'), icon: Printer, onPress: doPrint },
          { label: t('pdfPreview.split'), icon: Scissors, onPress: () => openOp('split') },
          { label: t('pdfPreview.toImages'), icon: Images, onPress: () => openOp('images') },
          { label: t('pdfPreview.reduce'), icon: FileDown, onPress: () => openOp('compress') },
        ]}
      />

      <Sheet visible={op !== null} onClose={() => setOp(null)} dismissable={!busy}>
        {busy ? (
          <View style={styles.opCenter}>
            <LoadingState label={op === 'images' ? t('pdfPreview.rendering') : op === 'compress' ? t('pdfPreview.reducing') : t('pdfPreview.splitting')} />
          </View>
        ) : result ? (
          <View>
            <Text variant="h2" style={styles.opTitle}>{op === 'split' ? t('pdfPreview.splitDone') : t('pdfPreview.reduceDone')}</Text>
            {op === 'compress' && origBytes > 0 && (
              <Text variant="callout" color="textSecondary" style={styles.opInfo}>
                {fmtBytes(origBytes)} → {fmtBytes(result.bytes)}
                {result.bytes < origBytes ? `  (−${Math.round((1 - result.bytes / origBytes) * 100)}%)` : ''}
              </Text>
            )}
            {op === 'split' && (
              <Text variant="callout" color="textSecondary" style={styles.opInfo}>{fmtBytes(result.bytes)}</Text>
            )}
            <View style={styles.opRow}>
              <Button title={t('common.share')} icon={Share2} variant="secondary" style={styles.flex1} onPress={shareResult} />
              <Button title={t('pdfPreview.saveDoc')} icon={Save} style={[styles.flex1, styles.opGap]} onPress={saveResult} />
            </View>
          </View>
        ) : op === 'split' ? (
          <View>
            <Text variant="h2" style={styles.opTitle}>{t('pdfPreview.split')}</Text>
            <Text variant="callout" color="textSecondary" style={styles.opInfo}>{t('pdfPreview.rangeHint').replace('{n}', String(total || 1))}</Text>
            <View style={styles.rangeRow}>
              <TextInput
                value={from} onChangeText={v => setFrom(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad" accessibilityLabel={t('pdfPreview.fromPage')}
                style={[styles.rangeInput, { color: theme.colors.text, backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border, borderRadius: theme.radius.sm }]}
              />
              <Text variant="body" color="textTertiary">–</Text>
              <TextInput
                value={to} onChangeText={v => setTo(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad" accessibilityLabel={t('pdfPreview.toPage')}
                style={[styles.rangeInput, { color: theme.colors.text, backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border, borderRadius: theme.radius.sm }]}
              />
            </View>
            <View style={styles.opRow}>
              <Button title={t('common.cancel')} variant="secondary" style={styles.flex1} onPress={() => setOp(null)} />
              <Button title={t('pdfPreview.extract')} style={[styles.flex1, styles.opGap]} onPress={runSplit} />
            </View>
          </View>
        ) : op === 'compress' ? (
          <View>
            <Text variant="h2" style={styles.opTitle}>{t('pdfPreview.reduce')}</Text>
            <Text variant="callout" color="textSecondary" style={styles.opInfo}>{t('pdfPreview.reduceHint')}</Text>
            <View style={styles.levelRow}>
              {(['high', 'medium', 'low'] as const).map(l => {
                const on = l === level;
                return (
                  <Pressable
                    key={l}
                    onPress={() => { haptics.light(); setLevel(l); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[styles.levelChip, { backgroundColor: on ? theme.colors.brand : theme.colors.surfaceAlt, borderRadius: theme.radius.sm }]}
                  >
                    <Text variant="callout" style={{ color: on ? theme.colors.onBrand : theme.colors.textSecondary }}>{l === 'high' ? t('pdfPreview.levelHigh') : l === 'medium' ? t('pdfPreview.levelMedium') : t('pdfPreview.levelLow')}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.opRow}>
              <Button title={t('common.cancel')} variant="secondary" style={styles.flex1} onPress={() => setOp(null)} />
              <Button title={t('pdfPreview.reduceCta')} style={[styles.flex1, styles.opGap]} onPress={runCompress} />
            </View>
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function Toggle({
  active,
  onPress,
  icon: Icon,
  label,
}: {
  active: boolean;
  onPress: () => void;
  icon: typeof Rows3;
  label: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      style={[
        styles.toggle,
        {
          backgroundColor: active ? theme.colors.brandSubtle : theme.colors.surfaceAlt,
          borderRadius: theme.radius.pill,
        },
      ]}
    >
      <Icon size={16} color={active ? theme.colors.brand : theme.colors.textSecondary} />
      <Text variant="callout" color={active ? 'brand' : 'textSecondary'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 20 },
  headActions: { flexDirection: 'row' },
  body: { flex: 1 },
  pdf: { flex: 1, width: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  bar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, borderTopWidth: StyleSheet.hairlineWidth },
  jumpRow: { flexDirection: 'row', alignItems: 'center' },
  slider: { flex: 1, marginHorizontal: 8, marginTop: 10 },
  tools: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 4 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  flex1: { flex: 1 },
  opCenter: { paddingVertical: 24, alignItems: 'center' },
  opTitle: { marginBottom: 8 },
  opInfo: { marginBottom: 16 },
  opRow: { flexDirection: 'row', marginTop: 8 },
  opGap: { marginLeft: 10 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 8 },
  rangeInput: { width: 96, minHeight: 48, borderWidth: StyleSheet.hairlineWidth, textAlign: 'center', fontSize: 18 },
  levelRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  levelChip: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
