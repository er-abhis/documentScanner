import { useEffect, useState } from 'react';
import { Modal, StyleSheet, TextInput, View } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { useTheme } from '../theme';

type Props = {
  visible: boolean;
  initial?: string;
  title?: string;
  onSubmit: (text: string) => void;
  onDelete?: () => void;
  onClose: () => void;
};

/** Small centered modal for entering/editing an annotation's text. */
export function TextInputModal({ visible, initial = '', title = 'Add text', onSubmit, onDelete, onClose }: Props) {
  const theme = useTheme();
  const [value, setValue] = useState(initial);

  useEffect(() => {
    if (visible) setValue(initial);
  }, [visible, initial]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl }]}>
          <Text variant="title" style={styles.title}>{title}</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            autoFocus
            multiline
            placeholder="Type here…"
            placeholderTextColor={theme.colors.textTertiary}
            style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md }]}
          />
          <View style={styles.row}>
            {onDelete && (
              <Button title="Delete" variant="danger" fullWidth={false} style={styles.flex1} onPress={onDelete} />
            )}
            <Button title="Cancel" variant="secondary" fullWidth={false} style={[styles.flex1, styles.gap]} onPress={onClose} />
            <Button
              title="Done"
              fullWidth={false}
              style={[styles.flex1, styles.gap]}
              onPress={() => {
                const t = value.trim();
                if (t) onSubmit(t);
                else onClose();
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, padding: 20 },
  title: { marginBottom: 14 },
  input: { minHeight: 80, padding: 14, fontSize: 16, textAlignVertical: 'top' },
  row: { flexDirection: 'row', marginTop: 16 },
  flex1: { flex: 1 },
  gap: { marginLeft: 10 },
});
