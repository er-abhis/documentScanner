import React from 'react';
import { useRef, useState } from 'react';
import { Pressable, StatusBar, StyleSheet, View } from 'react-native';
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
} from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { IconButton } from '../components/IconButton';
import { Slider } from '../components/Slider';
import { LoadingState } from '../components/LoadingState';
import { sharePdf } from '../services/sharing';
import { useDeferredMount } from '../hooks/useDeferredMount';
import { useT } from '../i18n';
import { HIT_SLOP, useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

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
});
