import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, FadeInDown, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';
import { Text } from './Text';
import { useTheme } from '../theme';

// keep Modal mounted long enough for the exit animation to play (Modal unmounts children instantly on visible=false)
const EXIT_MS = 260;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const ASheet = AnimatedPressable;

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
  // mounted lags `visible` on close so the exit animation has time to run before the Modal unmounts
  const [mounted, setMounted] = useState(visible);
  useEffect(() => {
    if (visible) return setMounted(true);
    const id = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(id);
  }, [visible]);

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      {visible && (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(EXIT_MS)} style={styles.flex}>
          <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={onClose}>
            <ASheet
              entering={SlideInDown.springify().damping(22).stiffness(220).mass(0.9)}
              exiting={SlideOutDown.duration(EXIT_MS)}
              style={[styles.sheet, { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.lg, borderTopRightRadius: theme.radius.lg }, theme.elevation(3)]}
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
                    style={({ pressed }) => [
                      styles.row,
                      pressed && { backgroundColor: theme.colors.surfaceAlt }
                    ]}
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
            </ASheet>
          </Pressable>
        </Animated.View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  title: { paddingHorizontal: 8, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 8 },
});
