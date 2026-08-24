import { pick, keepLocalCopy, types, errorCodes, isErrorWithCode } from '@react-native-documents/picker';

/**
 * Let the user pick a PDF from device storage / cloud providers. Returns a
 * stable local file:// uri (content:// is copied into the cache) plus the file
 * name, or null if cancelled.
 */
export async function pickPdf(): Promise<{ uri: string; name: string } | null> {
  try {
    const [res] = await pick({ type: [types.pdf] });
    if (!res) return null;
    const name = res.name ?? 'Document.pdf';
    const [copy] = await keepLocalCopy({
      files: [{ uri: res.uri, fileName: name }],
      destination: 'cachesDirectory',
    });
    const uri = copy.status === 'success' ? copy.localUri : res.uri;
    return { uri, name };
  } catch (e) {
    if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) return null;
    return null;
  }
}
