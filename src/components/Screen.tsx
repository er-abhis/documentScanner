import type { ReactNode } from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

type Props = {
  children: ReactNode;
  /** center content (empty / loading / error screens) */
  center?: boolean;
  /** wrap content in a ScrollView */
  scroll?: boolean;
  /** horizontal padding on the content area (default true) */
  padded?: boolean;
  edges?: Edge[];
};

export function Screen({
  children,
  center,
  scroll,
  padded = true,
  edges = ['top', 'left', 'right', 'bottom'],
}: Props) {
  const theme = useTheme();
  const pad = padded ? { paddingHorizontal: theme.spacing.xl } : null;

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[
        pad,
        { paddingBottom: theme.spacing['2xl'], flexGrow: 1 },
        center && styles.center,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, pad, center && styles.center]}>{children}</View>
  );

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      edges={edges}
    >
      <StatusBar barStyle={theme.colors.statusBar} />
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
});
