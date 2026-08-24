import { useCallback, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { FileText, Share2, LayoutGrid } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { sharePdf } from '../services/sharing';
import { LoadingState } from '../components/LoadingState';
import {
  generateDocumentPdf,
  listDocuments,
  pageUris,
  pdfUri,
  type DocumentMeta,
} from '../services/storage';
import { spacing, useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

export function DocumentScreen({ route, navigation }: RootScreenProps<'Document'>) {
  const theme = useTheme();
  const { id } = route.params;
  const [doc, setDoc] = useState<DocumentMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [makingPdf, setMakingPdf] = useState(false);

  const openPdf = async () => {
    if (!doc) return;
    const existing = pdfUri(doc);
    try {
      let uri = existing;
      if (!uri) {
        setMakingPdf(true);
        uri = await generateDocumentPdf(doc.id);
        setMakingPdf(false);
      }
      navigation.navigate('PdfPreview', { uri, name: doc.name });
    } catch {
      setMakingPdf(false);
      Alert.alert('Couldn’t create PDF', 'Please try again.');
    }
  };

  const shareDoc = async () => {
    if (!doc) return;
    try {
      let uri = pdfUri(doc);
      if (!uri) {
        setMakingPdf(true);
        uri = await generateDocumentPdf(doc.id);
        setMakingPdf(false);
      }
      await sharePdf(uri, doc.name);
    } catch {
      setMakingPdf(false);
      Alert.alert('Couldn’t share', 'Please try again.');
    }
  };

  useFocusEffect(
    useCallback(() => {
      listDocuments().then(list => {
        setDoc(list.find(d => d.id === id) ?? null);
        setLoading(false);
      });
    }, [id]),
  );

  if (loading) {
    return (
      <Screen center>
        <LoadingState />
      </Screen>
    );
  }

  if (makingPdf) {
    return (
      <Screen center>
        <LoadingState label="Creating PDF…" />
      </Screen>
    );
  }

  if (!doc) {
    return (
      <Screen>
        <Header title="Document" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text variant="body" color="textSecondary">
            This document is no longer available.
          </Text>
        </View>
      </Screen>
    );
  }

  const uris = pageUris(doc);

  return (
    <Screen padded={false}>
      <View style={styles.head}>
        <Header
          title={doc.name}
          onBack={() => navigation.goBack()}
          right={
            <View style={styles.headActions}>
              <IconButton
                icon={LayoutGrid}
                onPress={() => navigation.navigate('Organize', { id })}
                accessibilityLabel="Organize pages"
              />
              <IconButton icon={Share2} onPress={shareDoc} accessibilityLabel="Share document" />
            </View>
          }
        />
        <Text variant="caption" color="textSecondary" style={styles.sub}>
          {uris.length} page{uris.length === 1 ? '' : 's'}
        </Text>
      </View>
      <FlatList
        data={uris}
        keyExtractor={(u, i) => `${u}-${i}`}
        numColumns={2}
        columnWrapperStyle={styles.rowGap}
        contentContainerStyle={styles.grid}
        initialNumToRender={6}
        windowSize={5}
        removeClippedSubviews
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeIn.delay(Math.min(index, 10) * 40)}
            style={styles.cell}
          >
            <Pressable
              accessibilityRole="imagebutton"
              accessibilityLabel={`Page ${index + 1}`}
              onPress={() =>
                navigation.navigate('PagePreview', { uri: item, index, total: uris.length })
              }
            >
              <Image
                source={{ uri: item }}
                style={[styles.thumb, { borderColor: theme.colors.border, borderRadius: theme.radius.md }]}
                resizeMode="cover"
                resizeMethod="resize"
              />
              <Text variant="label" color="textTertiary" style={styles.pageLabel}>
                PAGE {index + 1}
              </Text>
            </Pressable>
          </Animated.View>
        )}
      />
      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <Button
          title={doc.pdfFile ? 'View PDF' : 'Create PDF'}
          icon={FileText}
          onPress={openPdf}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: spacing.xl },
  headActions: { flexDirection: 'row' },
  sub: { marginLeft: 4, marginBottom: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  rowGap: { gap: spacing.md },
  cell: { flex: 1, marginBottom: spacing.md, alignItems: 'center' },
  thumb: { width: '100%', aspectRatio: 3 / 4, borderWidth: StyleSheet.hairlineWidth, backgroundColor: '#00000008' },
  pageLabel: { marginTop: 6 },
  footer: { padding: spacing.xl, borderTopWidth: StyleSheet.hairlineWidth },
});
