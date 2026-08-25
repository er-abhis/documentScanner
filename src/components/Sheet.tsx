import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../theme';

const APressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** allow closing via backdrop tap / hardware back (off while processing) */
  dismissable?: boolean;
  /** wrap content in a scroll view for tall sheets */
  scroll?: boolean;
};

/**
 * Shared premium bottom sheet — one popup language for the whole app.
 * Frosted glossy top sheen, spring slide-up, safe-area aware, theme-driven so
 * it reads correctly in light and dark. Reuse this instead of hand-rolling a
 * Modal per screen.
 */
export function Sheet({ visible, onClose, children, dismissable = true, scroll = false }: Props) {
  const theme = useTheme();
  const close = () => {
    if (dismissable) onClose();
  };

  const inner = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      bounces={false}
      contentContainerStyle={styles.scrollPad}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View entering={FadeIn.duration(180)} style={styles.flex}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={close}>
          <APressable
            entering={SlideInDown.springify().damping(22).stiffness(240).mass(0.9)}
            onPress={() => {}}
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.surface,
                borderTopLeftRadius: theme.radius.xl,
                borderTopRightRadius: theme.radius.xl,
                borderColor: theme.colors.border,
                borderWidth: theme.mode === 'dark' ? StyleSheet.hairlineWidth : 0,
              },
              theme.elevation(3),
            ]}
          >
            {/* subtle glossy sheen at the top edge — premium, not loud */}
            <LinearGradient
              colors={
                theme.mode === 'dark'
                  ? ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']
                  : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0)']
              }
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.gloss}
              pointerEvents="none"
            />
            <SafeAreaView edges={['bottom']}>
              <View style={[styles.grabber, { backgroundColor: theme.colors.borderStrong }]} />
              {inner}
            </SafeAreaView>
          </APressable>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { paddingHorizontal: 20, paddingTop: 8, overflow: 'hidden' },
  gloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 4, marginBottom: 14 },
  scrollPad: { paddingBottom: 8 },
});
