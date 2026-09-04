import { useEffect, useRef } from 'react';
import { ScanLine, TriangleAlert } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { useDocumentScanner } from '../hooks/useDocumentScanner';
import { detectBarcode } from '../services/barcode';
import { useDraft } from '../state/draft';
import { useT } from '../i18n';
import type { RootScreenProps } from '../types/navigation';

/**
 * Launcher screen: opens the native scanner, appends captured pages to the
 * draft, then hands off to the Pages editor. Holds no UI of its own.
 */
export function ScannerScreen({ route, navigation }: RootScreenProps<'Scanner'>) {
  const t = useT();
  const append = route.params?.append ?? false;
  const { state, scan } = useDocumentScanner();
  const { addPages, clear } = useDraft();
  const launched = useRef(false);
  const handled = useRef(false);

  useEffect(() => {
    if (launched.current) return;
    launched.current = true;
    if (!append) clear(); // fresh document
    scan();
  }, [append, clear, scan]);

  useEffect(() => {
    if (state.status === 'cancelled') {
      if (navigation.canGoBack()) navigation.goBack();
      return;
    }
    if (state.status !== 'success' || handled.current) return;
    handled.current = true;

    (async () => {
      // A QR/barcode captured instead of a document → show its details.
      const first = state.pages[0]?.uri;
      if (!append && first) {
        const code = await detectBarcode(first);
        if (code) {
          navigation.replace('QrResult', { value: code.value, format: code.format });
          return;
        }
      }
      addPages(state.pages.map(p => p.uri));
      if (append) navigation.goBack();
      else navigation.replace('Pages');
    })();
  }, [state, append, addPages, navigation]);

  if (state.status === 'error') {
    return (
      <Screen>
        <Header title={t('scanner.title')} onBack={() => navigation.goBack()} />
        <EmptyState
          icon={TriangleAlert}
          title={t('scanner.errorTitle')}
          subtitle={state.message}
          actionLabel={t('scanner.tryAgain')}
          actionIcon={ScanLine}
          onAction={() => scan()}
        />
      </Screen>
    );
  }

  return (
    <Screen center>
      <LoadingState label={t('scanner.detecting')} />
    </Screen>
  );
}
