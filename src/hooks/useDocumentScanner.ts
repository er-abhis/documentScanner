import { useCallback, useState } from 'react';
import scanner, {
  type ScanOptions,
  type ScannedPage,
} from '../services/scanner';

type ScanState =
  | { status: 'idle' }
  | { status: 'scanning' }
  | { status: 'success'; pages: ScannedPage[] }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

export function useDocumentScanner() {
  const [state, setState] = useState<ScanState>({ status: 'idle' });

  const scan = useCallback(async (options?: ScanOptions) => {
    setState({ status: 'scanning' });
    try {
      const result = await scanner.scan(options);
      if (result.status === 'cancel') {
        setState({ status: 'cancelled' });
        return result;
      }
      setState({ status: 'success', pages: result.pages });
      return result;
    } catch (e: any) {
      // Surface the real native error — the generic message hid R8-stripped
      // ML Kit classes and Play Services module-download failures.
      console.warn('Document scan failed:', e);
      setState({
        status: 'error',
        message: e?.message || String(e),
      });
      return { status: 'cancel' as const, pages: [] };
    }
  }, []);

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, scan, reset };
}
