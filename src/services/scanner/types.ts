/** One scanned page returned by the native scanner. */
export type ScannedPage = {
  /** Local file uri of the cropped, perspective-corrected image. */
  uri: string;
};

export type ScanStatus = 'success' | 'cancel';

export type ScanResult = {
  status: ScanStatus;
  pages: ScannedPage[];
};

export type ScanOptions = {
  /** Max pages the user can capture in one session (Android only). */
  maxPages?: number;
  /** Cropped image quality 0-100. */
  quality?: number;
};

/**
 * Platform-agnostic scanner contract. The UI depends only on this — never on
 * ML Kit / VisionKit / the underlying plugin.
 */
export interface DocumentScannerService {
  scan(options?: ScanOptions): Promise<ScanResult>;
}
