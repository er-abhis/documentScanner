import { useEffect, useRef } from 'react';
import { ScanLine, TriangleAlert } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { useDocumentScanner } from '../hooks/useDocumentScanner';
import { useDraft } from '../state/draft';
import type { RootScreenProps } from '../types/navigation';

/**
 * Launcher screen: opens the native scanner, appends captured pages to the
 * draft, then hands off to the Pages editor. Holds no UI of its own.
 */
export function ScannerScreen({ route, navigation }: RootScreenProps<'Scanner'>) {
  const append = route.params?.append ?? false;
  const { state, scan } = useDocumentScanner();
  const { addPages, clear } = useDraft();
  const launched = useRef(false);

  useEffect(() => {
    if (launched.current) return;
    launched.current = true;
    if (!append) clear(); // fresh document
    scan();
  }, [append, clear, scan]);

  useEffect(() => {
    if (state.status === 'success') {
      addPages(state.pages.map(p => p.uri));
      if (append) navigation.goBack();
      else navigation.replace('Pages');
    } else if (state.status === 'cancelled') {
      if (navigation.canGoBack()) navigation.goBack();
    }
  }, [state, append, addPages, navigation]);

  if (state.status === 'error') {
    return (
      <Screen>
        <Header title="Scan" onBack={() => navigation.goBack()} />
        <EmptyState
          icon={TriangleAlert}
          title="Couldn't scan this document"
          subtitle={state.message}
          actionLabel="Try Again"
          actionIcon={ScanLine}
          onAction={() => scan()}
        />
      </Screen>
    );
  }

  return (
    <Screen center>
      <LoadingState label="Detecting document…" />
    </Screen>
  );
}
