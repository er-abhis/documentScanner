import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import ReorderableList, {
  reorderItems,
  useIsActive,
  useReorderableDrag,
  type ReorderableListReorderEvent,
} from 'react-native-reorderable-list';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { GripVertical, Plus, Trash2, Crop, FileText } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { IconButton } from '../components/IconButton';
import { LoadingState } from '../components/LoadingState';
import { saveDocument } from '../services/storage';
import { useDraft, type DraftPage } from '../state/draft';
import { HIT_SLOP, useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

export function PagesScreen({ navigation }: RootScreenProps<'Pages'>) {
  const theme = useTheme();
  const { pages, setPages, removePage, replacePage, clear } = useDraft();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (pages.length === 0) return;
    setSaving(true);
    try {
      await saveDocument(pages);
      clear();
      navigation.reset({
        index: 1,
        routes: [{ name: 'Home' }, { name: 'Documents' }],
      });
    } catch {
      setSaving(false);
      Alert.alert('Couldn’t save', 'Please try again.');
    }
  };

  const onReorder = ({ from, to }: ReorderableListReorderEvent) => {
    setPages(reorderItems(pages, from, to));
  };

  const confirmRemove = (id: string) => {
    if (pages.length <= 1) {
      Alert.alert('Remove the only page?', 'This will discard the document.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            removePage(id);
            navigation.popToTop();
          },
        },
      ]);
      return;
    }
    Alert.alert('Remove page?', 'This page will be discarded.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removePage(id) },
    ]);
  };

  const edit = (page: DraftPage) =>
    navigation.navigate('Editor', {
      uri: page.uri,
      onDone: uri => replacePage(page.id, uri),
    });

  if (saving) {
    return (
      <Screen center>
        <LoadingState label="Saving document…" />
      </Screen>
    );
  }

  if (pages.length === 0) {
    return (
      <Screen>
        <Header title="Pages" onBack={() => navigation.popToTop()} />
        <EmptyState
          icon={FileText}
          title="No pages"
          subtitle="Scan a document to start building your file."
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.headerPad}>
        <Header title="Pages" onBack={() => navigation.popToTop()} />
        <Text variant="caption" color="textSecondary" style={styles.count}>
          {pages.length} page{pages.length === 1 ? '' : 's'} · hold the handle to reorder
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
          title="Add Page"
          icon={Plus}
          variant="secondary"
          onPress={() => navigation.navigate('Scanner', { append: true })}
        />
        <Button title="Save Document" onPress={save} style={styles.gap} />
      </View>
    </Screen>
  );
}

function PageRow({
  page,
  index,
  onEdit,
  onRemove,
  onPreview,
}: {
  page: DraftPage;
  index: number;
  onEdit: () => void;
  onRemove: () => void;
  onPreview: () => void;
}) {
  const theme = useTheme();
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
        <Pressable onPress={onPreview} accessibilityLabel={`Preview page ${index + 1}`}>
          <Image
            source={{ uri: page.uri }}
            style={[styles.thumb, { borderRadius: theme.radius.md }]}
            resizeMode="cover"
            resizeMethod="resize"
          />
        </Pressable>

        <View style={styles.meta}>
          <Text variant="bodyStrong">Page {index + 1}</Text>
          <Pressable onPress={onEdit} style={styles.editLink} hitSlop={HIT_SLOP}>
            <Crop size={14} color={theme.colors.brand} />
            <Text variant="callout" color="brand">
              Edit
            </Text>
          </Pressable>
        </View>

        <IconButton
          icon={Trash2}
          onPress={onRemove}
          accessibilityLabel={`Remove page ${index + 1}`}
          color={theme.colors.danger}
        />
        <Pressable
          onLongPress={drag}
          delayLongPress={120}
          hitSlop={HIT_SLOP}
          accessibilityLabel={`Drag to reorder page ${index + 1}`}
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
  editLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  handle: { padding: 6, marginLeft: 4 },
  footer: { padding: 20, borderTopWidth: StyleSheet.hairlineWidth },
  gap: { marginTop: 12 },
});
