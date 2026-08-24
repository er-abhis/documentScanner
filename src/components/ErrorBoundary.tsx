import { Component, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Top-level crash guard. Any render/lifecycle error below is caught here and
 * shows a recoverable screen instead of a white/blank crash. Kept self-contained
 * (no theme/i18n hooks) so it still renders even if a provider is what failed.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // ponytail: log-only; no crash-reporting SDK by design (privacy/offline app)
    console.error('Unhandled UI error:', error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.titleHi}>कुछ गड़बड़ हो गई</Text>
        <Text style={styles.sub}>
          The app hit an unexpected error. Your documents are safe.
        </Text>
        <Pressable onPress={this.reset} style={styles.btn} accessibilityRole="button">
          <Text style={styles.btnText}>Try again · पुनः प्रयास करें</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#040B19', alignItems: 'center', justifyContent: 'center', padding: 28 },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  titleHi: { color: '#FFFFFFB0', fontSize: 16, fontWeight: '600', marginBottom: 14 },
  sub: { color: '#FFFFFF99', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  btn: { backgroundColor: '#3B82F6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
