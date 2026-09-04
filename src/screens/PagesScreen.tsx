import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import ReorderableList, {
  reorderItems,
  useIsActive,
  useReorderableDrag,
  type ReorderableListReorderEvent,
} from 'react-native-reorderable-list';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { GripVertical, Plus, Trash2, Crop, FileText, Pen } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { IconButton } from '../components/IconButton';
import { LoadingState } from '../components/LoadingState';
import { useToast } from '../components/Toast';
import { useDialog } from '../components/Dialog';
import { saveDocument } from '../services/storage';
import { useDraft, type DraftPage } from '../state/draft';
import { useI18n, useT } from '../i18n';
import { HIT_SLOP, useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

export function PagesScreen({ navigation }: RootScreenProps<'Pages'>) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const toast = useToast();
  const dialog = useDialog();
  const { pages, setPages, removePage, replacePage, clear } = useDraft();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (pages.length === 0) return;
    setSaving(true);
    try {
      await saveDocument(pages);
      clear();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Tabs', state: { index: 1, routes: [{ name: 'Home' }, { name: 'Documents' }] } }],
      });
    } catch {
      setSaving(false);
      toast({ variant: 'error', message: t('pages.tryAgain') });
    }
  };

  const onReorder = ({ from, to }: ReorderableListReorderEvent) => {
    setPages(reorderItems(pages, from, to));
  };

  const confirmRemove = async (id: string) => {
    if (pages.length <= 1) {
      const ok = await dialog.confirm({
        title: t('pages.removeOnlyTitle'),
        message: t('pages.removeOnlyMsg'),
        confirmText: t('pages.discard'),
        cancelText: t('common.cancel'),
        destructive: true,
      });
      if (ok) {
        removePage(id);
        navigation.popToTop();
      }
      return;
    }
    const ok = await dialog.confirm({
      title: t('pages.removeTitle'),
      message: t('pages.removeMsg'),
      confirmText: t('pages.remove'),
      cancelText: t('common.cancel'),
      destructive: true,
    });
    if (ok) removePage(id);
  };

  const edit = (page: DraftPage) =>
    navigation.navigate('Editor', {
      uri: page.uri,
      onDone: uri => replacePage(page.id, uri),
    });

  const draw = (page: DraftPage) =>
    navigation.navigate('Annotate', {
      uri: page.uri,
      onDone: uri => replacePage(page.id, uri),
    });

  if (saving) {
    return (
      <Screen center>
        <LoadingState label={t('pages.savingDocument')} />
      </Screen>
    );
  }

  if (pages.length === 0) {
    return (
      <Screen>
        <Header title={t('pages.title')} onBack={() => navigation.popToTop()} />
        <EmptyState
          icon={FileText}
          title={t('pages.noPages')}
          subtitle={t('pages.emptySub')}
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.headerPad}>
        <Header title={t('pages.title')} onBack={() => navigation.popToTop()} />
        <Text variant="caption" color="textSecondary" style={styles.count}>
          {lang === 'hi'
            ? `${pages.length} पेज · क्रम बदलने के लिए हैंडल दबाए रखें`
            : `${pages.length} page${pages.length === 1 ? '' : 's'} · hold the handle to reorder`}
        </Text>
      </View>

      <ReorderableList
        data={pages}
        keyExtractor={p => p.id}
        onReorder={onReorder}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <PageRow
            page={item}
            index={index}
            onEdit={() => edit(item)}
            onDraw={() => draw(item)}
            onRemove={() => confirmRemove(item.id)}
            onPreview={() =>
              navigation.navigate('PagePreview', {
                uri: item.uri,
                index,
                total: pages.length,
              })
            }
          />
        )}
      />

      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <Button
          title={t('pages.addPage')}
          icon={Plus}
          variant="secondary"
          onPress={() => navigation.navigate('Scanner', { append: true })}
        />
        <Button title={t('pages.saveDocument')} onPress={save} style={styles.gap} />
      </View>
    </Screen>
  );
}

function PageRow({
  page,
  index,
  onEdit,
  onDraw,
  onRemove,
  onPreview,
}: {
  page: DraftPage;
  index: number;
  onEdit: () => void;
  onDraw: () => void;
  onRemove: () => void;
  onPreview: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const drag = useReorderableDrag();
  const active = useIsActive();

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(active ? 1.03 : 1, { duration: 150 }) }],
    opacity: withTiming(active ? 0.96 : 1, { duration: 150 }),
  }));

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
        <Pressable onPress={onPreview} accessibilityLabel={`${t('pages.a11yPreview')} ${index + 1}`}>
          <Image
            source={{ uri: page.uri }}
            style={[styles.thumb, { borderRadius: theme.radius.md }]}
            resizeMode="cover"
            resizeMethod="resize"
          />
        </Pressable>

        <View style={styles.meta}>
          <Text variant="bodyStrong">{`${t('pages.page')} ${index + 1}`}</Text>
          <View style={styles.links}>
            <Pressable onPress={onEdit} style={styles.editLink} hitSlop={HIT_SLOP}>
              <Crop size={14} color={theme.colors.brand} />
              <Text variant="callout" color="brand">
                {t('common.edit')}
              </Text>
            </Pressable>
            <Pressable onPress={onDraw} style={styles.editLink} hitSlop={HIT_SLOP}>
              <Pen size={14} color={theme.colors.brand} />
              <Text variant="callout" color="brand">
                {t('pages.draw')}
              </Text>
            </Pressable>
          </View>
        </View>

        <IconButton
          icon={Trash2}
          onPress={onRemove}
          accessibilityLabel={`${t('pages.a11yRemove')} ${index + 1}`}
          color={theme.colors.danger}
        />
        <Pressable
          onLongPress={drag}
          delayLongPress={120}
          hitSlop={HIT_SLOP}
          accessibilityLabel={`${t('pages.a11yDrag')} ${index + 1}`}
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
  thumb: { width: 56, height: 72, backgroundColor: '#00000010' },
  meta: { flex: 1, marginLeft: 14 },
  links: { flexDirection: 'row', gap: 16, marginTop: 4 },
  editLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  handle: { padding: 6, marginLeft: 4 },
  footer: { padding: 20, borderTopWidth: StyleSheet.hairlineWidth },
  gap: { marginTop: 12 },
});
