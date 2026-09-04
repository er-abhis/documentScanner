import { useCallback, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ReorderableList, {
  reorderItems,
  useIsActive,
  useReorderableDrag,
  type ReorderableListReorderEvent,
} from 'react-native-reorderable-list';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { GripVertical, RotateCw, Copy, Trash2, FileText } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { useToast } from '../components/Toast';
import { useDialog } from '../components/Dialog';
import { listDocuments, pageUris, reorganizeDocument, type DocumentMeta } from '../services/storage';
import { useI18n, useT } from '../i18n';
import { HIT_SLOP, useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

type PageItem = { key: string; file: string; uri: string; rotation: number };

export function OrganizeScreen({ route, navigation }: RootScreenProps<'Organize'>) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const toast = useToast();
  const dialog = useDialog();
  const { id } = route.params;
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const dirty = useRef(false);
  const seq = useRef(0);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      listDocuments().then(list => {
        if (!live) return;
        const meta = list.find(d => d.id === id) as DocumentMeta | undefined;
        if (meta) {
          const uris = pageUris(meta);
          setPages(
            meta.pageFiles.map((f, i) => ({
              key: `k${seq.current++}`,
              file: f,
              uri: uris[i],
              rotation: 0,
            })),
          );
        }
        setLoading(false);
      }).catch(() => live && setLoading(false));
      return () => {
        live = false;
      };
      // load once per document; re-runs on focus are harmless (only before edits)
    }, [id]),
  );

  const markDirty = () => (dirty.current = true);

  const onReorder = ({ from, to }: ReorderableListReorderEvent) => {
    setPages(p => reorderItems(p, from, to));
    markDirty();
  };

  const rotate = (key: string) => {
    setPages(p => p.map(i => (i.key === key ? { ...i, rotation: (i.rotation + 90) % 360 } : i)));
    markDirty();
  };

  const duplicate = (key: string) => {
    setPages(p => {
      const idx = p.findIndex(i => i.key === key);
      if (idx < 0) return p;
      const copy = { ...p[idx], key: `k${seq.current++}` };
      return [...p.slice(0, idx + 1), copy, ...p.slice(idx + 1)];
    });
    markDirty();
  };

  const remove = async (key: string) => {
    if (pages.length <= 1) {
      toast({ variant: 'info', message: t('organize.cantRemoveMsg') });
      return;
    }
    const ok = await dialog.confirm({
      title: t('organize.removeTitle'),
      message: t('organize.removeMsg'),
      confirmText: t('organize.remove'),
      cancelText: t('common.cancel'),
      destructive: true,
    });
    if (ok) {
      setPages(p => p.filter(i => i.key !== key));
      markDirty();
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await reorganizeDocument(
        id,
        pages.map(p => ({ file: p.file, rotation: p.rotation })),
      );
      navigation.goBack();
    } catch {
      setSaving(false);
      toast({ variant: 'error', message: t('organize.tryAgain') });
    }
  };

  const confirmBack = async () => {
    if (!dirty.current) return navigation.goBack();
    const ok = await dialog.confirm({
      title: t('organize.discardTitle'),
      message: t('organize.discardMsg'),
      confirmText: t('organize.discard'),
      cancelText: t('organize.keepEditing'),
      destructive: true,
    });
    if (ok) navigation.goBack();
  };

  if (loading) {
    return (
      <Screen center>
        <LoadingState />
      </Screen>
    );
  }
  if (saving) {
    return (
      <Screen center>
        <LoadingState label={t('organize.savingPages')} />
      </Screen>
    );
  }
  if (pages.length === 0) {
    return (
      <Screen>
        <Header title={t('organize.title')} onBack={() => navigation.goBack()} />
        <EmptyState icon={FileText} title={t('organize.noPages')} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.headerPad}>
        <Header title={t('organize.titlePages')} onBack={confirmBack} />
        <Text variant="caption" color="textSecondary" style={styles.count}>
          {lang === 'hi'
            ? `${pages.length} पेज · क्रम बदलने के लिए हैंडल दबाए रखें`
            : `${pages.length} page${pages.length === 1 ? '' : 's'} · hold the handle to reorder`}
        </Text>
      </View>

      <ReorderableList
        data={pages}
        keyExtractor={p => p.key}
        onReorder={onReorder}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <PageRow
            item={item}
            index={index}
            onRotate={() => rotate(item.key)}
            onDuplicate={() => duplicate(item.key)}
            onRemove={() => remove(item.key)}
          />
        )}
      />

      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <Button title={t('organize.saveChanges')} icon={FileText} onPress={save} />
      </View>
    </Screen>
  );
}

function PageRow({
  item,
  index,
  onRotate,
  onDuplicate,
  onRemove,
}: {
  item: PageItem;
  index: number;
  onRotate: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const drag = useReorderableDrag();
  const active = useIsActive();
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(active ? 1.03 : 1, { duration: 150 }) }],
    opacity: withTiming(active ? 0.96 : 1, { duration: 150 }),
  }));
  const uri = item.uri;

  return (
    <Animated.View style={[styles.rowWrap, style]}>
      <View
        style={[
          styles.row,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderColor: theme.colors.border,
            borderWidth: theme.mode === 'dark' ? StyleSheet.hairlineWidth : 0,
          },
          theme.elevation(active ? 3 : 1),
        ]}
      >
        <View style={[styles.thumbBox, { borderRadius: theme.radius.md }]}>
          {uri ? (
            <Image
              source={{ uri }}
              style={[styles.thumb, { transform: [{ rotate: `${item.rotation}deg` }] }]}
              resizeMode="cover"
              resizeMethod="resize"
            />
          ) : null}
        </View>

        <View style={styles.meta}>
          <Text variant="bodyStrong">{`${t('organize.page')} ${index + 1}`}</Text>
          <View style={styles.actions}>
            <IconButton icon={RotateCw} onPress={onRotate} accessibilityLabel={`${t('organize.a11yRotate')} ${index + 1}`} />
            <IconButton icon={Copy} onPress={onDuplicate} accessibilityLabel={`${t('organize.a11yDuplicate')} ${index + 1}`} />
            <IconButton
              icon={Trash2}
              onPress={onRemove}
              accessibilityLabel={`${t('organize.a11yRemove')} ${index + 1}`}
              color={theme.colors.danger}
            />
          </View>
        </View>

        <Pressable
          onLongPress={drag}
          delayLongPress={120}
          hitSlop={HIT_SLOP}
          accessibilityLabel={`${t('organize.a11yDrag')} ${index + 1}`}
          style={styles.handle}
        >
          <GripVertical size={theme.iconSize.md} color={theme.colors.textTertiary} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerPad: { paddingHorizontal: 20 },
  count: { marginBottom: 8, marginLeft: 4 },
  list: { paddingHorizontal: 20, paddingBottom: 16 },
  rowWrap: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  thumbBox: { width: 56, height: 72, overflow: 'hidden', backgroundColor: '#00000010' },
  thumb: { width: '100%', height: '100%' },
  meta: { flex: 1, marginLeft: 14 },
  actions: { flexDirection: 'row', marginTop: 4, marginLeft: -8 },
  handle: { padding: 6, marginLeft: 4 },
  footer: { padding: 20, borderTopWidth: StyleSheet.hairlineWidth },
});
