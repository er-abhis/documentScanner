import { openableUrl, formatLabel, BarcodeFormat } from '../src/services/barcode';

// detectBarcode is native (ML Kit, on-device only) — not unit-testable here.
// These cover the pure helpers that decide QrResult's "Open" action + label.

describe('openableUrl', () => {
  it('accepts web + scheme links', () => {
    expect(openableUrl('https://claude.com')).toBe('https://claude.com');
    expect(openableUrl('mailto:a@b.com')).toBe('mailto:a@b.com');
    expect(openableUrl('tel:+15551234')).toBe('tel:+15551234');
    expect(openableUrl('upi://pay?pa=x@ybl')).toBe('upi://pay?pa=x@ybl');
  });
  it('prefixes bare www hosts', () => {
    expect(openableUrl('www.claude.com')).toBe('https://www.claude.com');
  });
  it('rejects plain text', () => {
    expect(openableUrl('just some text')).toBeNull();
    expect(openableUrl('WIFI:S:net;T:WPA;;')).toBeNull();
  });
});

describe('formatLabel', () => {
  it('names known formats, falls back otherwise', () => {
    expect(formatLabel(BarcodeFormat.QR_CODE)).toBe('QR Code');
    expect(formatLabel(BarcodeFormat.EAN_13)).toBe('EAN-13');
    expect(formatLabel(BarcodeFormat.UNKNOWN)).toBe('Barcode');
  });
});
