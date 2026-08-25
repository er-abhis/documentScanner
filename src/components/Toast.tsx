import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { AlertTriangle, CheckCircle2, Info, type LucideIcon } from 'lucide-react-native';
import { Text } from './Text';
import { useTheme } from '../theme';

type Variant = 'success' | 'error' | 'info';
type ToastInput = { message: string; variant?: Variant; duration?: number };
type Toast = ToastInput & { id: number };

const ICONS: Record<Variant, LucideIcon> = { success: CheckCircle2, error: AlertTriangle, info: Info };

const ToastCtx = createContext<(t: ToastInput) => void>(() => {});

/** Fire a premium toast from anywhere: `const toast = useToast(); toast({ message: 'Saved' })`. */
export const useToast = () => useContext(ToastCtx);

/** App-wide toast host. Mount once near the root (inside SafeAreaProvider + ThemeProvider). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((input: ToastInput) => {
    if (timer.current) clearTimeout(timer.current);
    const t: Toast = { variant: 'success', duration: 2600, ...input, id: Date.now() + Math.random() };
    setToast(t);
    timer.current = setTimeout(() => setToast(null), t.duration);
  }, []);

  return (
    <ToastCtx.Provider value={show}>
      {children}
      <ToastHost toast={toast} onHide={() => setToast(null)} />
    </ToastCtx.Provider>
  );
}

function ToastHost({ toast, onHide }: { toast: Toast | null; onHide: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  if (!toast) return null;

  const variant = toast.variant ?? 'success';
  const Icon = ICONS[variant];
  const accent =
    variant === 'success' ? theme.colors.success : variant === 'error' ? theme.colors.danger : theme.colors.brand;

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.host]}>
      <Animated.View
        key={toast.id}
        entering={FadeInDown.springify().damping(18).stiffness(220).mass(0.7)}
        exiting={FadeOutDown.duration(220)}
        style={[
          styles.toast,
          {
            marginBottom: insets.bottom + 18,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.pill,
            borderColor: theme.colors.border,
            borderWidth: theme.mode === 'dark' ? StyleSheet.hairlineWidth : 0,
          },
          theme.elevation(3),
        ]}
      >
        <LinearGradient
          colors={theme.mode === 'dark' ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)'] : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.gloss}
          pointerEvents="none"
        />
        <Pressable onPress={onHide} accessibilityRole="alert" accessibilityLabel={toast.message} style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: accent + '22' }]}>
            <Icon size={18} color={accent} />
          </View>
          <Text variant="callout" numberOfLines={2} style={styles.msg}>{toast.message}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { alignItems: 'center', justifyContent: 'flex-end' },
  toast: { maxWidth: 460, minHeight: 48, marginHorizontal: 20, overflow: 'hidden' },
  gloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 10, paddingRight: 18 },
  iconWrap: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  msg: { flexShrink: 1, fontWeight: '600' },
});
