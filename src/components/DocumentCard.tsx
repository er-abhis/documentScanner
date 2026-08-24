import { memo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { FileText, MoreVertical } from 'lucide-react-native';
import { Text } from './Text';
import { IconButton } from './IconButton';
import { useTheme } from '../theme';
import { thumbUri, type DocumentMeta } from '../services/storage';

type Props = {
  doc: DocumentMeta;
  onOpen: (doc: DocumentMeta) => void;
  onMore: (doc: DocumentMeta) => void;
};

function relativeDate(ts: number) {
  const d = new Date(ts);
  const p = (n: number) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function DocumentCardBase({ doc, onOpen, onMore }: Props) {
  const theme = useTheme();
  const uri = thumbUri(doc);
  return (
    <Pressable
      onPress={() => onOpen(doc)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${doc.name}`}
      android_ripple={{ color: theme.colors.border }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: theme.mode === 'dark' ? StyleSheet.hairlineWidth : 0,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.75 : 1,
        },
        theme.elevation(1),
      ]}
    >
      <View style={[styles.thumb, { backgroundColor: theme.colors.surfaceSunken, borderRadius: theme.radius.md }]}>
        {uri ? (
          <Image source={{ uri }} style={styles.img} resizeMode="cover" resizeMethod="resize" />
        ) : (
          <FileText size={theme.iconSize.lg} color={theme.colors.textTertiary} />
        )}
      </View>
      <View style={styles.meta}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {doc.name}
        </Text>
        <Text variant="caption" color="textSecondary" style={styles.sub}>
          {relativeDate(doc.updatedAt)} · {doc.pageFiles.length} page
          {doc.pageFiles.length === 1 ? '' : 's'}
          {doc.pdfFile ? ' · PDF' : ''}
        </Text>
      </View>
      <IconButton icon={MoreVertical} onPress={() => onMore(doc)} accessibilityLabel={`Actions for ${doc.name}`} />
    </Pressable>
  );
}

/** Memoized: avoids re-rendering every card when the list state changes. */
export const DocumentCard = memo(DocumentCardBase);

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 12 },
  thumb: { width: 52, height: 66, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  meta: { flex: 1, marginLeft: 14 },
  sub: { marginTop: 4 },
});
