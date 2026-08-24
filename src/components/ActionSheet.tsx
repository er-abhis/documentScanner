import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';
import { Text } from './Text';
import { useTheme } from '../theme';

export type SheetAction = {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  destructive?: boolean;
};

type Props = {
  visible: boolean;
  title?: string;
  actions: SheetAction[];
  onClose: () => void;
};

/** Lightweight cross-platform bottom action sheet (plain RN Modal). */
export function ActionSheet({ visible, title, actions, onClose }: Props) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.lg, borderTopRightRadius: theme.radius.lg }]}
        >
          <SafeAreaView edges={['bottom']}>
            <View style={[styles.grabber, { backgroundColor: theme.colors.borderStrong }]} />
            {title ? (
              <Text variant="caption" color="textTertiary" style={styles.title}>
                {title}
              </Text>
            ) : null}
            {actions.map((a, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  onClose();
                  a.onPress();
                }}
                android_ripple={{ color: theme.colors.border }}
                accessibilityRole="button"
                accessibilityLabel={a.label}
                style={styles.row}
              >
                <a.icon
                  size={theme.iconSize.md}
                  color={a.destructive ? theme.colors.danger : theme.colors.text}
                />
                <Text variant="body" style={{ color: a.destructive ? theme.colors.danger : theme.colors.text }}>
                  {a.label}
                </Text>
              </Pressable>
            ))}
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  title: { paddingHorizontal: 8, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 8 },
});
