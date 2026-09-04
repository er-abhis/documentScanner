import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { AlertTriangle, Info, type LucideIcon } from 'lucide-react-native';
import { Text } from './Text';
import { Button } from './Button';
import { useTheme, type Theme } from '../theme';

type Tone = 'brand' | 'danger' | 'success' | 'warning';

type BaseOpts = {
  title: string;
  message?: string;
  icon?: LucideIcon;
  tone?: Tone;
  confirmText?: string;
};
type ConfirmOpts = BaseOpts & { cancelText?: string; destructive?: boolean };

type Api = {
  /** Themed replacement for a two-button Alert. Resolves true if confirmed. */
  confirm: (o: ConfirmOpts) => Promise<boolean>;
  /** Themed replacement for a single-button Alert. */
  alert: (o: BaseOpts) => Promise<void>;
};

type State =
  | ({ kind: 'confirm'; resolve: (v: boolean) => void } & ConfirmOpts)
  | ({ kind: 'alert'; resolve: () => void } & BaseOpts);

const DialogCtx = createContext<Api>({ confirm: async () => false, alert: async () => {} });

/** `const dialog = useDialog(); if (await dialog.confirm({ title, destructive: true })) …` */
export const useDialog = () => useContext(DialogCtx);

/** App-wide dialog host. Mount once near the root (inside ThemeProvider). */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null);

  const confirm = useCallback(
    (o: ConfirmOpts) => new Promise<boolean>(resolve => setState({ kind: 'confirm', resolve, ...o })),
    [],
  );
  const alert = useCallback(
    (o: BaseOpts) => new Promise<void>(resolve => setState({ kind: 'alert', resolve, ...o })),
    [],
  );

  const finish = (result: boolean) =>
    setState(cur => {
      if (cur?.kind === 'confirm') cur.resolve(result);
      else if (cur?.kind === 'alert') cur.resolve();
      return null;
    });

  return (
    <DialogCtx.Provider value={{ confirm, alert }}>
      {children}
      {state ? <DialogHost state={state} onDone={finish} /> : null}
    </DialogCtx.Provider>
  );
}

function toneColor(theme: Theme, tone: Tone) {
  switch (tone) {
    case 'danger': return { fg: theme.colors.danger, bg: theme.colors.dangerSubtle };
    case 'success': return { fg: theme.colors.success, bg: theme.colors.successSubtle };
    case 'warning': return { fg: theme.colors.warning, bg: theme.colors.warningSubtle };
    default: return { fg: theme.colors.brand, bg: theme.colors.brandSubtle };
  }
}

function DialogHost({ state, onDone }: { state: State; onDone: (r: boolean) => void }) {
  const theme = useTheme();
  const isConfirm = state.kind === 'confirm';
  const destructive = isConfirm && state.destructive;
  const tone: Tone = state.tone ?? (destructive ? 'danger' : 'brand');
  const { fg, bg } = toneColor(theme, tone);
  const Icon = state.icon ?? (destructive ? AlertTriangle : Info);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => onDone(false)}>
      <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(160)} style={styles.flex}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={() => onDone(false)}>
          <Animated.View
            entering={ZoomIn.springify().damping(20).stiffness(240).mass(0.8)}
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.xl,
                borderColor: theme.colors.border,
                borderWidth: theme.mode === 'dark' ? StyleSheet.hairlineWidth : 0,
              },
              theme.elevation(3),
            ]}
          >
            {/* stop backdrop tap from closing when tapping the card */}
            <Pressable onPress={() => {}}>
              <LinearGradient
                colors={theme.mode === 'dark' ? ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)'] : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0)']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.gloss}
                pointerEvents="none"
              />
              <View style={[styles.iconBadge, { backgroundColor: bg }]}>
                <Icon size={26} color={fg} />
              </View>
              <Text variant="h2" style={styles.title}>{state.title}</Text>
              {state.message ? (
                <Text variant="body" color="textSecondary" style={styles.message}>{state.message}</Text>
              ) : null}

              <View style={styles.actions}>
                {isConfirm ? (
                  <>
                    <Button
                      title={state.cancelText ?? 'Cancel'}
                      variant="secondary"
                      fullWidth={false}
                      style={styles.flex1}
                      onPress={() => onDone(false)}
                    />
                    <Button
                      title={state.confirmText ?? 'Confirm'}
                      variant={destructive ? 'danger' : 'primary'}
                      fullWidth={false}
                      style={[styles.flex1, styles.gap]}
                      onPress={() => onDone(true)}
                    />
                  </>
                ) : (
                  <Button
                    title={state.confirmText ?? 'OK'}
                    fullWidth
                    onPress={() => onDone(true)}
                  />
                )}
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { width: '100%', maxWidth: 420, padding: 24, overflow: 'hidden' },
  gloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 80 },
  iconBadge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  title: { textAlign: 'center' },
  message: { textAlign: 'center', marginTop: 8, lineHeight: 21 },
  actions: { flexDirection: 'row', marginTop: 24 },
  flex1: { flex: 1 },
  gap: { marginLeft: 12 },
});
