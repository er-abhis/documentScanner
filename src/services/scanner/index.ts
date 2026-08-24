import DocumentScanner, {
  ResponseType,
  ScanDocumentResponseStatus,
} from 'react-native-document-scanner-plugin';
import type {
  DocumentScannerService,
  ScanOptions,
  ScanResult,
} from './types';

export * from './types';

/**
 * Single implementation backed by react-native-document-scanner-plugin, which
 * uses ML Kit Document Scanner on Android and VisionKit on iOS. Both give edge
 * detection, auto-crop and perspective correction natively.
 */
const scanner: DocumentScannerService = {
  async scan(options?: ScanOptions): Promise<ScanResult> {
    const { scannedImages, status } = await DocumentScanner.scanDocument({
      responseType: ResponseType.ImageFilePath,
      croppedImageQuality: options?.quality ?? 100,
      ...(options?.maxPages != null && { maxNumDocuments: options.maxPages }),
    });

    if (status === ScanDocumentResponseStatus.Cancel) {
      return { status: 'cancel', pages: [] };
    }

    return {
      status: 'success',
      pages: (scannedImages ?? []).map(uri => ({ uri: normalizeUri(uri) })),
    };
  },
};

/** Native paths come back without a scheme; <Image> needs file:// on Android. */
function normalizeUri(path: string): string {
  return path.startsWith('file://') || path.startsWith('content://')
    ? path
    : `file://${path}`;
}

export default scanner;
