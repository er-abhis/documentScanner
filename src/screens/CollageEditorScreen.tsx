import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Skia, type SkImage } from '@shopify/react-native-skia';
import {
  Images,
  Ratio as RatioIcon,
  PaintBucket,
  Rows,
  Frame as FrameIcon,
  Share2,
  Save,
  ImagePlus,
  Trash2,
  Replace,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { Slider } from '../components/Slider';
import { LoadingState } from '../components/LoadingState';
import { CollageCanvas } from '../components/collage/CollageCanvas';
import { pickImages } from '../services/gallery';
import { templateById } from '../services/collage/templates';
import { exportCollageImage, exportCollagePdf } from '../services/collage/export';
import { saveDocument, generateDocumentPdf } from '../services/storage';
import { shareImage, sharePdf } from '../services/sharing';
import {
  DEFAULT_STYLE,
  emptyFill,
  type CollageProject,
  type FrameFill,
  type FrameStyle,
  type Ratio,
} from '../services/collage/types';
import type { ImgFormat } from '../services/image/encode';
import { useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

type Panel = 'photos' | 'ratio' | 'background' | 'spacing' | 'style' | 'export';

const BG_COLORS = ['#FFFFFF', '#111111', '#F2F2F7', '#0F172A', '#FDF2F8', '#052E2B', '#1E1B4B'];
const RATIOS: { key: Ratio; label: string }[] = [
  { key: '1:1', label: 'Square' },
  { key: '4:5', label: 'Post' },
  { key: '9:16', label: 'Story' },
  { key: '3:4', label: 'Portrait' },
  { key: '16:9', label: 'Landscape' },
  { key: 'A4', label: 'A4' },
];
const STYLES: { key: FrameStyle; label: string }[] = [
  { key: 'none', label: 'Clean' },
  { key: 'white', label: 'White' },
  { key: 'polaroid', label: 'Polaroid' },
  { key: 'shadow', label: 'Shadow' },
];
const FORMATS: { key: ImgFormat | 'pdf'; label: string }[] = [
  { key: 'jpg', label: 'JPG' },
  { key: 'png', label: 'PNG' },
  { key: 'webp', label: 'WEBP' },
  { key: 'pdf', label: 'PDF' },
];

export function CollageEditorScreen({ route, navigation }: RootScreenProps<'CollageEditor'>) {
  const theme = useTheme();
  const template = templateById(route.params.templateId);

  const [project, setProject] = useState<CollageProject>(() => ({
    templateId: route.params.templateId,
    ratio: template?.ratio ?? '1:1',
    fills: {},
    texts: [],
    style: { ...DEFAULT_STYLE },
  }));
  const [images, setImages] = useState<Record<string, SkImage | undefined>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>('photos');
  const [format, setFormat] = useState<ImgFormat | 'pdf'>('jpg');
  const [busy, setBusy] = useState(false);

  // decode any newly-referenced images
  useEffect(() => {
    let live = true;
    const uris = Array.from(new Set(Object.values(project.fills).map(f => f.uri).filter(Boolean) as string[]));
    const missing = uris.filter(u => !(u in images));
    if (missing.length === 0) return;
    (async () => {
      const add: Record<string, SkImage | undefined> = {};
      for (const u of missing) {
        try {
          add[u] = Skia.Image.MakeImageFromEncoded(await Skia.Data.fromURI(u)) ?? undefined;
        } catch {
          add[u] = undefined;
        }
      }
      if (live) setImages(prev => ({ ...prev, ...add }));
    })();
    return () => {
      live = false;
    };
  }, [project.fills, images]);

  const hasPhotos = useMemo(() => Object.values(project.fills).some(f => f.uri), [project.fills]);

  if (!template) {
    return (
      <Screen>
        <Header title="Collage" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text color="textSecondary">This layout is unavailable.</Text>
        </View>
      </Screen>
    );
  }

  const setFill = (id: string, fill: FrameFill) =>
    setProject(p => ({ ...p, fills: { ...p.fills, [id]: fill } }));

  const assign = async (frameId: string) => {
    const [uri] = await pickImages(1);
    if (!uri) return;
    setFill(frameId, { ...emptyFill(), uri });
    setSelected(frameId);
  };

  const fillEmpty = async () => {
    const empty = template.frames.filter(f => !project.fills[f.id]?.uri);
    if (empty.length === 0) return;
    const uris = await pickImages(empty.length);
    if (uris.length === 0) return;
    setProject(p => {
      const fills = { ...p.fills };
      empty.forEach((f, i) => {
        if (uris[i]) fills[f.id] = { ...emptyFill(), uri: uris[i] };
      });
      return { ...p, fills };
    });
  };

  const removePhoto = (id: string) =>
    setProject(p => {
      const fills = { ...p.fills };
      delete fills[id];
      return { ...p, fills };
    });

  const onSelect = (frameId: string, isEmpty: boolean) => {
    setSelected(frameId);
    if (isEmpty) assign(frameId);
  };

  const patchStyle = (patch: Partial<CollageProject['style']>) =>
    setProject(p => ({ ...p, style: { ...p.style, ...patch } }));

  const doExport = async (mode: 'save' | 'share') => {
    if (!hasPhotos) {
      Alert.alert('Add a photo first', 'Tap a frame to add photos to your collage.');
      return;
    }
    setBusy(true);
    try {
      if (format === 'pdf') {
        const pdf = await exportCollagePdf(template, project);
        if (mode === 'share') await sharePdf(pdf, 'Collage');
        else {
          const meta = await saveDocument([{ uri: await exportCollageImage(template, project, 'jpg') }], 'Collage');
          await generateDocumentPdf(meta.id);
        }
      } else {
        const img = await exportCollageImage(template, project, format);
        if (mode === 'share') await shareImage(img);
        else await saveDocument([{ uri: img }], 'Collage');
      }
      setBusy(false);
      if (mode === 'save') {
        navigation.navigate('Tabs', { screen: 'Documents' });
      }
    } catch {
      setBusy(false);
      Alert.alert('Export failed', 'Please try again.');
    }
  };

  const back = () => {
    if (!hasPhotos) return navigation.goBack();
    Alert.alert('Discard collage?', 'Your collage will be lost.', [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  if (busy) {
    return (
      <Screen center>
        <LoadingState label="Exporting…" />
      </Screen>
    );
  }

  const selFill = selected ? project.fills[selected] : undefined;

  return (
    <Screen padded={false}>
      <View style={styles.head}>
        <Header
          title="Collage"
          onBack={back}
          right={<IconButton icon={Images} onPress={fillEmpty} accessibilityLabel="Add photos" />}
        />
      </View>

      <View style={styles.canvas}>
        <CollageCanvas
          template={template}
          project={project}
          images={images}
          selectedId={selected}
          onSelect={onSelect}
          onAdjust={setFill}
          brand={theme.colors.brand}
        />
      </View>

      {/* selected-frame quick actions */}
      {selected && selFill?.uri && (
        <View style={styles.selBar}>
          <MiniAction icon={Replace} label="Replace" onPress={() => assign(selected)} />
          <MiniAction icon={Trash2} label="Remove" onPress={() => removePhoto(selected)} danger />
          <Text variant="caption" color="textTertiary" style={styles.hint}>
            Drag / pinch to fit
          </Text>
        </View>
      )}

      {/* contextual panel */}
      <View style={[styles.panel, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <View style={styles.panelBody}>
          {panel === 'photos' && (
            <Button title="Add Photos to Empty Frames" icon={ImagePlus} onPress={fillEmpty} />
          )}
          {panel === 'ratio' && (
            <ChipRow
              items={RATIOS.map(r => ({ key: r.key, label: r.label }))}
              active={project.ratio}
              onPick={k => setProject(p => ({ ...p, ratio: k as Ratio }))}
            />
          )}
          {panel === 'background' && (
            <View style={styles.swatches}>
              {BG_COLORS.map(c => (
                <Pressable
                  key={c}
                  onPress={() => patchStyle({ background: c })}
                  style={[styles.swatch, { backgroundColor: c, borderColor: project.style.background === c ? theme.colors.brand : theme.colors.border, borderWidth: project.style.background === c ? 3 : StyleSheet.hairlineWidth }]}
                />
              ))}
            </View>
          )}
          {panel === 'spacing' && (
            <>
              <Slider label="Spacing" value={project.style.spacing} min={0} max={0.08} onChange={v => patchStyle({ spacing: v })} format={v => `${Math.round(v * 100)}`} />
              <Slider label="Corner radius" value={project.style.cornerRadius} min={0} max={0.2} onChange={v => patchStyle({ cornerRadius: v })} format={v => `${Math.round(v * 100)}`} />
            </>
          )}
          {panel === 'style' && (
            <ChipRow
              items={STYLES.map(s => ({ key: s.key, label: s.label }))}
              active={project.style.frameStyle}
              onPick={k => patchStyle({ frameStyle: k as FrameStyle })}
            />
          )}
          {panel === 'export' && (
            <>
              <ChipRow items={FORMATS} active={format} onPick={k => setFormat(k as ImgFormat | 'pdf')} />
              <View style={styles.exportBtns}>
                <Button title="Save" icon={Save} variant="secondary" fullWidth={false} style={styles.flex1} onPress={() => doExport('save')} />
                <Button title="Share" icon={Share2} fullWidth={false} style={[styles.flex1, styles.gapL]} onPress={() => doExport('share')} />
              </View>
            </>
          )}
        </View>

        {/* tool tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          <Tab icon={Images} label="Photos" active={panel === 'photos'} onPress={() => setPanel('photos')} />
          <Tab icon={RatioIcon} label="Ratio" active={panel === 'ratio'} onPress={() => setPanel('ratio')} />
          <Tab icon={PaintBucket} label="Background" active={panel === 'background'} onPress={() => setPanel('background')} />
          <Tab icon={Rows} label="Spacing" active={panel === 'spacing'} onPress={() => setPanel('spacing')} />
          <Tab icon={FrameIcon} label="Style" active={panel === 'style'} onPress={() => setPanel('style')} />
          <Tab icon={Share2} label="Export" active={panel === 'export'} onPress={() => setPanel('export')} />
        </ScrollView>
      </View>
    </Screen>
  );
}

function Tab({ icon: Icon, label, active, onPress }: { icon: LucideIcon; label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.tab}>
      <Icon size={20} color={active ? theme.colors.brand : theme.colors.textSecondary} />
      <Text variant="caption" color={active ? 'brand' : 'textSecondary'}>
        {label}
      </Text>
    </Pressable>
  );
}

function ChipRow({ items, active, onPick }: { items: { key: string; label: string }[]; active: string; onPick: (k: string) => void }) {
  const theme = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {items.map(it => {
        const on = it.key === active;
        return (
          <Pressable
            key={it.key}
            onPress={() => onPick(it.key)}
            style={[
              styles.chip,
              {
                backgroundColor: on ? theme.colors.brand : theme.colors.surface,
                borderRadius: theme.radius.pill,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: on ? theme.colors.brand : theme.colors.borderStrong,
              },
            ]}
          >
            <Text variant="bodyStrong" style={{ color: on ? theme.colors.onBrand : theme.colors.text }}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function MiniAction({ icon: Icon, label, onPress, danger }: { icon: LucideIcon; label: string; onPress: () => void; danger?: boolean }) {
  const theme = useTheme();
  const color = danger ? theme.colors.danger : theme.colors.brand;
  return (
    <Pressable onPress={onPress} style={styles.mini}>
      <Icon size={16} color={color} />
      <Text variant="callout" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  canvas: { flex: 1, marginHorizontal: 12, marginVertical: 8 },
  selBar: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 20, paddingVertical: 8 },
  hint: { marginLeft: 'auto' },
  mini: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  panel: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  panelBody: { paddingHorizontal: 16, minHeight: 64, justifyContent: 'center' },
  tabs: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  tab: { alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 14, paddingVertical: 6, minWidth: 64 },
  chipRow: { gap: 8, paddingVertical: 4, alignItems: 'center' },
  chip: { height: 38, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: { width: 34, height: 34, borderRadius: 17 },
  exportBtns: { flexDirection: 'row', marginTop: 12 },
  flex1: { flex: 1 },
  gapL: { marginLeft: 12 },
});
