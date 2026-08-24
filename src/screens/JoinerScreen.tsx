import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import RNFS from 'react-native-fs';
import { Plus, Rows3, Columns3, Save, Share2, Image as ImageIcon, FileText } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { Slider } from '../components/Slider';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { ActionSheet } from '../components/ActionSheet';
import { pickImages } from '../services/gallery';
import { joinImages, type JoinDirection } from '../services/image/join';
import { saveDocument, generateDocumentPdf } from '../services/storage';
import { buildPdfBase64 } from '../services/pdf';
import { shareImage, sharePdf } from '../services/sharing';
import { useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

/** Build a one-page PDF from the joined image into cache; returns file:// uri. */
async function joinedToPdf(imageUri: string): Promise<string> {
  const base64 = await buildPdfBase64([imageUri]);
  const path = `${RNFS.CachesDirectoryPath}/joined_${Date.now()}.pdf`;
  await RNFS.writeFile(path, base64, 'base64');
  return `file://${path}`;
}

const BACKGROUNDS = [
  { key: '#FFFFFF', label: 'White' },
  { key: '#F2F2F7', label: 'Light' },
  { key: '#111111', label: 'Black' },
];

export function JoinerScreen({ navigation }: RootScreenProps<'Joiner'>) {
  const theme = useTheme();
  const [uris, setUris] = useState<string[]>([]);
  const [direction, setDirection] = useState<JoinDirection>('vertical');
  const [spacing, setSpacing] = useState(16);
  const [background, setBackground] = useState('#FFFFFF');
  const [border, setBorder] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<null | 'save' | 'share'>(null);
  const picked = useRef(false);
  const job = useRef(0);

  // pick images on first mount
  useEffect(() => {
    if (picked.current) return;
    picked.current = true;
    pickImages().then(u => {
      if (u.length === 0) navigation.goBack();
      else setUris(u);
    });
  }, [navigation]);

  // recompose preview whenever inputs change (debounced)
  const compose = useCallback(async () => {
    if (uris.length === 0) return;
    const id = ++job.current;
    try {
      const out = await joinImages({
        uris,
        direction,
        spacing,
        background,
        borderWidth: border ? 4 : 0,
      });
      if (id === job.current) setPreview(out);
    } catch {
      if (id === job.current) setPreview(null);
    }
  }, [uris, direction, spacing, background, border]);

  useEffect(() => {
    const t = setTimeout(compose, 180);
    return () => clearTimeout(t);
  }, [compose]);

  const addMore = async () => {
    const more = await pickImages();
    if (more.length) setUris(prev => [...prev, ...more]);
  };

  const saveAs = async (asPdf: boolean) => {
    if (!preview) return;
    setBusy(true);
    try {
      const meta = await saveDocument([{ uri: preview }], 'Joined image');
      if (asPdf) await generateDocumentPdf(meta.id);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Tabs', state: { index: 1, routes: [{ name: 'Home' }, { name: 'Documents' }] } }],
      });
    } catch {
      setBusy(false);
      Alert.alert('Couldn’t save', 'Please try again.');
    }
  };

  const shareAs = async (asPdf: boolean) => {
    if (!preview) return;
    setBusy(true);
    try {
      if (asPdf) {
        const pdf = await joinedToPdf(preview);
        await sharePdf(pdf, 'Joined');
      } else {
        await shareImage(preview);
      }
    } catch {
      Alert.alert('Couldn’t share', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (busy) {
    return (
      <Screen center>
        <LoadingState label="Saving…" />
      </Screen>
    );
  }

  if (uris.length === 0) {
    return (
      <Screen center>
        <LoadingState label="Opening gallery…" />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.pad}>
        <Header title="Join Images" onBack={() => navigation.goBack()} />
        <Text variant="caption" color="textSecondary" style={styles.sub}>
          {uris.length} image{uris.length === 1 ? '' : 's'} · live preview
        </Text>
      </View>

      <View style={[styles.previewBox, { backgroundColor: theme.colors.surfaceAlt }]}>
        {preview ? (
          <Image source={{ uri: preview }} style={styles.preview} resizeMode="contain" />
        ) : (
          <EmptyState icon={Rows3} title="Composing…" />
        )}
      </View>

      <View style={styles.pad}>
        {/* direction */}
        <Segmented
          options={[
            { key: 'vertical', label: 'Vertical', icon: Rows3 },
            { key: 'horizontal', label: 'Horizontal', icon: Columns3 },
          ]}
          value={direction}
          onChange={k => setDirection(k as JoinDirection)}
        />

        <Slider label="Spacing" value={spacing} min={0} max={60} onChange={setSpacing} />

        {/* background */}
        <Text variant="caption" color="textSecondary" style={styles.optLabel}>
          Background
        </Text>
        <View style={styles.chips}>
          {BACKGROUNDS.map(b => (
            <Chip
              key={b.key}
              label={b.label}
              active={background === b.key}
              swatch={b.key}
              onPress={() => setBackground(b.key)}
            />
          ))}
          <Chip label="Border" active={border} onPress={() => setBorder(v => !v)} />
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <View style={styles.footerRow}>
          <Button
            title="Add"
            icon={Plus}
            variant="secondary"
            fullWidth={false}
            onPress={addMore}
            style={styles.flex1}
          />
          <Button
            title="Share"
            icon={Share2}
            variant="secondary"
            fullWidth={false}
            onPress={() => setSheet('share')}
            style={[styles.flex1, styles.gapL]}
          />
        </View>
        <Button title="Save to Library" icon={Save} onPress={() => setSheet('save')} style={styles.gapT} />
      </View>

      <ActionSheet
        visible={sheet !== null}
        title={sheet === 'share' ? 'Share as' : 'Save as'}
        onClose={() => setSheet(null)}
        actions={[
          {
            label: 'Image (JPG)',
            icon: ImageIcon,
            onPress: () => (sheet === 'share' ? shareAs(false) : saveAs(false)),
          },
          {
            label: 'PDF',
            icon: FileText,
            onPress: () => (sheet === 'share' ? shareAs(true) : saveAs(true)),
          },
        ]}
      />
    </Screen>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string; icon: typeof Rows3 }[];
  value: string;
  onChange: (k: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.seg, { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md }]}>
      {options.map(o => {
        const active = o.key === value;
        const Icon = o.icon;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[
              styles.segItem,
              { borderRadius: theme.radius.sm },
              active && { backgroundColor: theme.colors.surface, ...theme.elevation(1) },
            ]}
          >
            <Icon size={16} color={active ? theme.colors.brand : theme.colors.textSecondary} />
            <Text variant="callout" color={active ? 'brand' : 'textSecondary'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Chip({
  label,
  active,
  swatch,
  onPress,
}: {
  label: string;
  active: boolean;
  swatch?: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderRadius: theme.radius.pill,
          borderColor: active ? theme.colors.brand : theme.colors.border,
          backgroundColor: active ? theme.colors.brandSubtle : theme.colors.surface,
        },
      ]}
    >
      {swatch && (
        <View style={[styles.swatch, { backgroundColor: swatch, borderColor: theme.colors.border }]} />
      )}
      <Text variant="callout" color={active ? 'brand' : 'textSecondary'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 20 },
  sub: { marginBottom: 8, marginLeft: 4 },
  previewBox: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: { width: '100%', height: '100%' },
  seg: { flexDirection: 'row', padding: 4, marginBottom: 8 },
  segItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  optLabel: { marginTop: 8, marginBottom: 8, marginLeft: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  swatch: { width: 14, height: 14, borderRadius: 7, borderWidth: StyleSheet.hairlineWidth },
  footer: { padding: 20, borderTopWidth: StyleSheet.hairlineWidth },
  footerRow: { flexDirection: 'row' },
  flex1: { flex: 1 },
  gapL: { marginLeft: 12 },
  gapT: { marginTop: 12 },
});
