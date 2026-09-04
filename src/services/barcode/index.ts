import BarcodeScanning, {
  BarcodeFormat,
  type Barcode,
} from '@react-native-ml-kit/barcode-scanning';

export type { Barcode };
export { BarcodeFormat };

/**
 * Scan an image for a barcode/QR (on-device ML Kit). Returns the first code, or
 * null if the image simply has none. THROWS on a real failure (unreadable
 * image, ML Kit unavailable) so the QR scanner can show the actual error
 * instead of a misleading "no code found".
 */
export async function scanBarcode(uri: string): Promise<Barcode | null> {
  const codes = await BarcodeScanning.scan(uri);
  return codes[0] ?? null;
}

/**
 * Forgiving variant for the document-scan branch: any failure is swallowed so a
 * capture that isn't a QR just falls through to the normal document flow.
 */
export async function detectBarcode(uri: string): Promise<Barcode | null> {
  try {
    return await scanBarcode(uri);
  } catch (e) {
    console.warn('barcode scan failed:', e);
    return null;
  }
}

const FORMAT_LABELS: Record<number, string> = {
  [BarcodeFormat.QR_CODE]: 'QR Code',
  [BarcodeFormat.DATA_MATRIX]: 'Data Matrix',
  [BarcodeFormat.AZTEC]: 'Aztec',
  [BarcodeFormat.PDF417]: 'PDF417',
  [BarcodeFormat.CODE_128]: 'Code 128',
  [BarcodeFormat.CODE_39]: 'Code 39',
  [BarcodeFormat.CODE_93]: 'Code 93',
  [BarcodeFormat.CODABAR]: 'Codabar',
  [BarcodeFormat.EAN_13]: 'EAN-13',
  [BarcodeFormat.EAN_8]: 'EAN-8',
  [BarcodeFormat.ITF]: 'ITF',
  [BarcodeFormat.UPC_A]: 'UPC-A',
  [BarcodeFormat.UPC_E]: 'UPC-E',
};

export const formatLabel = (f: BarcodeFormat) => FORMAT_LABELS[f] ?? 'Barcode';

/**
 * Map a react-native-vision-camera CodeType string to the ML Kit BarcodeFormat
 * number so the live scanner and the doc-scan branch feed QrResult the same
 * numeric format. Unknown types fall back to -1 ("Barcode").
 */
const CODE_TYPE_TO_FORMAT: Record<string, BarcodeFormat> = {
  'qr': BarcodeFormat.QR_CODE,
  'data-matrix': BarcodeFormat.DATA_MATRIX,
  'aztec': BarcodeFormat.AZTEC,
  'pdf-417': BarcodeFormat.PDF417,
  'code-128': BarcodeFormat.CODE_128,
  'code-39': BarcodeFormat.CODE_39,
  'code-93': BarcodeFormat.CODE_93,
  'codabar': BarcodeFormat.CODABAR,
  'ean-13': BarcodeFormat.EAN_13,
  'ean-8': BarcodeFormat.EAN_8,
  'itf': BarcodeFormat.ITF,
  'upc-e': BarcodeFormat.UPC_E,
};

export const codeTypeToFormat = (type: string): number =>
  CODE_TYPE_TO_FORMAT[type] ?? -1;

/** A value we can hand to Linking.openURL (http, mail, tel, geo, sms…). */
export function openableUrl(value: string): string | null {
  const v = value.trim();
  if (/^(https?|mailto|tel|sms|smsto|geo|market|upi):/i.test(v)) return v;
  if (/^www\./i.test(v)) return `https://${v}`;
  return null;
}
