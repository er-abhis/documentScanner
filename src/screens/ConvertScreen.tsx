import { useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { ImagePlus, Share2, Save, RefreshCw } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { Slider } from '../components/Slider';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { pickImages } from '../services/gallery';
import { type ImgFormat } from '../services/image/encode';
import { processToFile, type ResizeRatio } from '../services/image/resize';
import { saveDocument } from '../services/storage';
import { shareFiles } from '../services/sharing';
import { useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

const FORMATS: { key: ImgFormat; label: string }[] = [
  { key: 'jpg', label: 'JPG' },
  { key: 'png', label: 'PNG' },
  { key: 'webp', label: 'WEBP' },
];
const MIME: Record<ImgFormat, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export function ConvertScreen({ navigation }: RootScreenProps<'Convert'>) {
  const theme = useTheme();
  const [sources, setSources] = useState<string[]>([]);
  const [format, setFormat] = useState<ImgFormat>('jpg');
  const [quality, setQuality] = useState(0.9);
  const [scale, setScale] = useState(1);
  const [ratio, setRatio] = useState<ResizeRatio>('original');
  const [progress, setProgress] = useState<number | null>(null);

  const pick = async () => {
    const uris = await pickImages();
    if (uris.length) setSources(prev => [...prev, ...uris]);
  };

  const convertAll = async (): Promise<string[]> => {
    const out: string[] = [];
    for (let i = 0; i < sources.length; i++) {
      setProgress(Math.round(((i + 1) / sources.length) * 100));
      out.push(await processToFile(sources[i], { scale, ratio, format, quality: Math.round(quality * 100) }));
    }
    return out;
  };

  const share = async () => {
    if (sources.length === 0) return;
    setProgress(0);
    try {
      const files = await convertAll();
      setProgress(null);
      await shareFiles(files, MIME[format]);
    } catch {
      setProgress(null);
      Alert.alert('Convert failed', 'Please try again.');
    }
  };

  const save = async () => {
    if (sources.length === 0) return;
    setProgress(0);
    try {
      const files = await convertAll();
      for (const f of files) await saveDocument([{ uri: f }], `Converted ${format.toUpperCase()}`);
      setProgress(null);
      navigation.navigate('Tabs', { screen: 'Documents' });
    } catch {
      setProgress(null);
      Alert.alert('Convert failed', 'Please try again.');
    }
  };

  if (progress !== null) {
    return (
      <Screen center>
        <LoadingState label={`Converting… ${progress}%`} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.head}>
        <Header title="Resize & Convert" onBack={() => navigation.goBack()} />
      </View>

      {sources.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="Resize & convert images"
          subtitle="Pick images, resize by % or ratio, and export as JPG, PNG or WEBP."
          actionLabel="Select Images"
          actionIcon={ImagePlus}
          onAction={pick}
        />
      ) : (
        <>
          <FlatList
            data={sources}
            keyExtractor={(u, i) => `${u}-${i}`}
            numColumns={3}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.gridRow}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={[styles.thumb, { borderRadius: theme.radius.md }]} />
            )}
            ListHeaderComponent={
              <Text variant="caption" color="textSecondary" style={styles.count}>
                {sources.length} image{sources.length === 1 ? '' : 's'} · output {format.toUpperCase()}
              </Text>
            }
          />

          <View style={[styles.panel, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
            <View style={styles.chips}>
              {FORMATS.map(f => {
                const on = f.key === format;
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => setFormat(f.key)}
                    style={[styles.chip, { backgroundColor: on ? theme.colors.brand : theme.colors.surfaceAlt, borderRadius: theme.radius.pill }]}
                  >
                    <Text variant="callout" style={{ color: on ? theme.colors.onBrand : theme.colors.textSecondary }}>
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text variant="caption" color="textSecondary" style={styles.optLabel}>
              Resize
            </Text>
            <View style={styles.chips}>
              {(['original', '1:1', '4:3', '3:4', '16:9', '9:16'] as ResizeRatio[]).map(r => {
                const on = r === ratio;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setRatio(r)}
                    style={[styles.chipSm, { backgroundColor: on ? theme.colors.brand : theme.colors.surfaceAlt, borderRadius: theme.radius.pill }]}
                  >
                    <Text variant="caption" style={{ color: on ? theme.colors.onBrand : theme.colors.textSecondary }}>
                      {r === 'original' ? 'Original' : r}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Slider label="Scale" value={scale} min={0.1} max={1} onChange={setScale} format={v => `${Math.round(v * 100)}%`} />

            {format !== 'png' && (
              <Slider label="Quality" value={quality} min={0.3} max={1} onChange={setQuality} format={v => `${Math.round(v * 100)}%`} />
            )}

            <View style={styles.actions}>
              <Button title="Add" icon={ImagePlus} variant="secondary" fullWidth={false} style={styles.flex1} onPress={pick} />
              <Button title="Save" icon={Save} variant="secondary" fullWidth={false} style={[styles.flex1, styles.gap]} onPress={save} />
              <Button title="Share" icon={Share2} fullWidth={false} style={[styles.flex1, styles.gap]} onPress={share} />
            </View>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 20 },
  count: { marginBottom: 10, marginLeft: 4 },
  grid: { paddingHorizontal: 20, paddingBottom: 16 },
  gridRow: { gap: 10, marginBottom: 10 },
  thumb: { flex: 1 / 3, aspectRatio: 1, backgroundColor: '#00000010' },
  panel: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 18, paddingVertical: 8 },
  chipSm: { paddingHorizontal: 12, paddingVertical: 6 },
  optLabel: { marginBottom: 8, marginLeft: 2 },
  actions: { flexDirection: 'row', marginTop: 4 },
  flex1: { flex: 1 },
  gap: { marginLeft: 10 },
});
