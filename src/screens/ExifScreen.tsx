import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { FileScan, ImagePlus, ShieldOff } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { useToast } from '../components/Toast';
import { pickImages } from '../services/gallery';
import { saveToGallery } from '../services/gallery/save';
import { readExif, stripExif, type ExifEntry } from '../services/image/exif';
import { haptics } from '../lib/haptics';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

export function ExifScreen({ navigation }: RootScreenProps<'Exif'>) {
  const theme = useTheme();
  const { lang } = useI18n();
  const hi = lang === 'hi';
  const toast = useToast();

  const [uri, setUri] = useState<string | null>(null);
  const [entries, setEntries] = useState<ExifEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    const [picked] = await pickImages(1);
    if (!picked) return;
    setUri(picked);
    setLoading(true);
    try {
      setEntries(await readExif(picked));
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const removeExif = async () => {
    if (!uri) return;
    setBusy(true);
    try {
      const clean = await stripExif(uri);
      await saveToGallery(clean);
      haptics.success();
      setEntries([]);
      toast({ variant: 'success', message: hi ? 'मेटाडेटा हटाकर सहेजा गया' : 'Saved a copy with metadata removed' });
    } catch {
      toast({ variant: 'error', message: hi ? 'हटा नहीं सका' : "Couldn't strip metadata" });
    } finally {
      setBusy(false);
    }
  };

  if (busy) return (<Screen center><LoadingState label={hi ? 'हटाया जा रहा है…' : 'Removing…'} /></Screen>);

  return (
    <Screen padded={false} scroll={false}>
      <View style={styles.head}>
        <Header title={hi ? 'मेटाडेटा / EXIF' : 'Metadata / EXIF'} onBack={() => navigation.goBack()} />
      </View>

      {!uri ? (
        <EmptyState
          icon={FileScan}
          title={hi ? 'EXIF देखें और हटाएँ' : 'View & remove EXIF'}
          subtitle={hi ? 'फ़ोटो चुनें — कैमरा, तारीख़ व GPS जैसी जानकारी देखें।' : 'Pick a photo to inspect camera, date & GPS data.'}
          actionLabel={hi ? 'फ़ोटो चुनें' : 'Select photo'}
          actionIcon={ImagePlus}
          onAction={pick}
        />
      ) : (
        <View style={styles.flex1}>
          <View style={styles.body}>
            <Image source={{ uri }} style={[styles.thumb, { borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceSunken }]} resizeMode="cover" />
            {loading ? (
              <LoadingState />
            ) : entries && entries.length > 0 ? (
              <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md }]}>
                {entries.map((e, i) => (
                  <View key={e.label} style={[styles.row, i < entries.length - 1 && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                    <Text variant="caption" color="textSecondary">{e.label}</Text>
                    <Text variant="callout" numberOfLines={1} style={styles.val}>{e.value}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyMeta}>
                <ShieldOff size={32} color={theme.colors.textTertiary} />
                <Text variant="callout" color="textSecondary" style={styles.emptyText}>
                  {hi ? 'कोई मेटाडेटा नहीं मिला।' : 'No metadata found.'}
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.actions, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
            <Button title={hi ? 'बदलें' : 'Change'} icon={ImagePlus} variant="secondary" style={styles.flex1} onPress={pick} />
            <Button title={hi ? 'EXIF हटाएँ' : 'Remove EXIF'} icon={ShieldOff} style={[styles.flex1, styles.gap]} onPress={removeExif} disabled={!entries || entries.length === 0} />
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
  body: { flex: 1, paddingHorizontal: 20 },
  thumb: { width: '100%', height: 180, marginTop: 8, marginBottom: 16 },
  card: { paddingHorizontal: 14, borderWidth: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 12 },
  val: { fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  emptyMeta: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { textAlign: 'center' },
  actions: { flexDirection: 'row', padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
