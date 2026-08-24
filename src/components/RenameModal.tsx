import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Text } from './Text';
import { Button } from './Button';
import { useTheme } from '../theme';

type Props = {
  visible: boolean;
  initial: string;
  title?: string;
  onCancel: () => void;
  onSubmit: (name: string) => void;
};

/** Cross-platform text-input prompt (Android has no Alert.prompt). */
export function RenameModal({ visible, initial, title = 'Rename', onCancel, onSubmit }: Props) {
  const theme = useTheme();
  const [text, setText] = useState(initial);

  useEffect(() => {
    if (visible) setText(initial);
  }, [visible, initial]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <Animated.View entering={FadeIn.duration(160)} style={styles.flex}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={onCancel}>
          <Animated.View entering={ZoomIn.springify().damping(18).stiffness(200)} style={styles.cardWrap}>
          <Pressable
            style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg }, theme.elevation(3)]}
          >
            <Text variant="title" style={styles.title}>
              {title}
            </Text>
            <TextInput
              value={text}
              onChangeText={setText}
              autoFocus
              selectTextOnFocus
              placeholder="Document name"
              placeholderTextColor={theme.colors.textTertiary}
              style={[
                styles.input,
                theme.typography.body,
                { color: theme.colors.text, borderColor: theme.colors.border, borderRadius: theme.radius.md },
              ]}
            />
            <View style={styles.row}>
              <Button title="Cancel" variant="secondary" fullWidth={false} style={styles.btn} onPress={onCancel} />
              <Button
                title="Save"
                fullWidth={false}
                style={styles.btn}
                onPress={() => text.trim() && onSubmit(text.trim())}
              />
            </View>
          </Pressable>
          </Animated.View>
        </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  cardWrap: { width: '100%', maxWidth: 400 },
  card: { width: '100%', padding: 20 },
  title: { marginBottom: 14 },
  input: { borderWidth: 1, paddingHorizontal: 12, height: 46, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  btn: { minWidth: 100 },
});
