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
    } catch {
      setState({
        status: 'error',
        message:
          'Something went wrong while scanning. Please make sure Google Play services is up to date and try again.',
      });
      return { status: 'cancel' as const, pages: [] };
    }
  }, []);

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, scan, reset };
}
