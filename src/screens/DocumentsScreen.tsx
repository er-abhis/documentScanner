import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { Copy, FileText, Pencil, ScanLine, SearchX, Share2, Trash2 } from 'lucide-react-native';
import { Alert } from 'react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { SearchBar } from '../components/SearchBar';
import { DocumentCard } from '../components/DocumentCard';
import { EmptyState } from '../components/EmptyState';
import { ActionSheet, type SheetAction } from '../components/ActionSheet';
import { RenameModal } from '../components/RenameModal';
import {
  deleteDocument,
  duplicateDocument,
  generateDocumentPdf,
  listDocuments,
  pdfUri,
  renameDocument,
  type DocumentMeta,
} from '../services/storage';
import { sharePdf } from '../services/sharing';
import { spacing } from '../theme';
import type { RootScreenProps } from '../types/navigation';

export function DocumentsScreen({ navigation }: RootScreenProps<'Documents'>) {
  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [query, setQuery] = useState('');
  const [sheetFor, setSheetFor] = useState<DocumentMeta | null>(null);
  const [renameFor, setRenameFor] = useState<DocumentMeta | null>(null);

  const reload = useCallback(() => {
    listDocuments().then(setDocs);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? docs.filter(d => d.name.toLowerCase().includes(q)) : docs;
  }, [docs, query]);

  const openDoc = useCallback(
    (d: DocumentMeta) => navigation.navigate('Document', { id: d.id }),
    [navigation],
  );
  const moreDoc = useCallback((d: DocumentMeta) => setSheetFor(d), []);

  const confirmDelete = (doc: DocumentMeta) => {
    Alert.alert('Delete document?', `“${doc.name}” will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteDocument(doc.id).then(reload),
      },
    ]);
  };

  const shareDoc = async (doc: DocumentMeta) => {
    try {
      const uri = pdfUri(doc) ?? (await generateDocumentPdf(doc.id));
      await sharePdf(uri, doc.name);
      reload();
    } catch {
      Alert.alert('Couldn’t share', 'Please try again.');
    }
  };

  const actions: SheetAction[] = sheetFor
    ? [
        { label: 'Share PDF', icon: Share2, onPress: () => shareDoc(sheetFor) },
        { label: 'Rename', icon: Pencil, onPress: () => setRenameFor(sheetFor) },
        {
          label: 'Duplicate',
          icon: Copy,
          onPress: () => duplicateDocument(sheetFor.id).then(reload),
        },
        { label: 'Delete', icon: Trash2, destructive: true, onPress: () => confirmDelete(sheetFor) },
      ]
    : [];

  return (
    <Screen padded={false}>
      <View style={styles.head}>
        <Header title="My Documents" />
        {docs.length > 0 ? (
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search documents" />
        ) : null}
      </View>

      {docs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          subtitle="Scan your first document to create a PDF you can share."
          actionLabel="Scan Document"
          actionIcon={ScanLine}
          onAction={() => navigation.navigate('Scanner')}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={SearchX} title="No matches" subtitle={`Nothing found for “${query}”.`} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={d => d.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 45).springify().damping(18)}>
              <DocumentCard doc={item} onOpen={openDoc} onMore={moreDoc} />
            </Animated.View>
          )}
        />
      )}

      <ActionSheet
        visible={!!sheetFor}
        title={sheetFor?.name}
        actions={actions}
        onClose={() => setSheetFor(null)}
      />
      <RenameModal
        visible={!!renameFor}
        initial={renameFor?.name ?? ''}
        onCancel={() => setRenameFor(null)}
        onSubmit={name => {
          if (renameFor) renameDocument(renameFor.id, name).then(reload);
          setRenameFor(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: spacing.xl },
  list: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl },
});
