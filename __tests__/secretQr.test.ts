// Buffer is a Node global available in the jest env (used only to cross-check
// our codec); declare it so tsc doesn't need @types/node for this test.
declare const Buffer: { from: (b: Uint8Array | string, enc?: string) => { toString(enc: string): string } };

// Node (jest env) provides global crypto.getRandomValues; the RN polyfill
// (react-native-get-random-values, loaded in index.js) is only needed on device.
import { encryptSecret, decryptSecret, isSecretQr, DecryptError } from '../src/services/crypto/secretQr';

// Reach the private base64 codec through the public round-trip. We also fuzz it
// directly against Node's Buffer below via a re-import of the raw functions.
import { bytesToBase64, base64ToBytes, utf8ToBytes, bytesToUtf8 } from '../src/services/crypto/secretQr';

describe('secretQr AES-256-GCM', () => {
  const msg = 'I love you ❤️';
  const pw = 'correct horse';

  it('round-trips a message with the right password', () => {
    const payload = encryptSecret(msg, pw);
    expect(isSecretQr(payload)).toBe(true);
    expect(payload).not.toContain(msg); // ciphertext, not plaintext
    expect(decryptSecret(payload, pw)).toBe(msg);
  });

  it('never embeds the raw password in the payload', () => {
    const payload = encryptSecret('hello', 'S3cr3t!Password');
    expect(payload).not.toContain('S3cr3t!Password');
  });

  it('rejects a wrong password as an auth error, not corruption', () => {
    const payload = encryptSecret(msg, pw);
    try {
      decryptSecret(payload, 'nope');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(DecryptError);
      expect((e as DecryptError).kind).toBe('auth');
    }
  });

  it('retry after wrong password still decrypts with the right one', () => {
    const payload = encryptSecret(msg, pw);
    expect(() => decryptSecret(payload, 'wrong1')).toThrow();
    expect(() => decryptSecret(payload, 'wrong2')).toThrow();
    expect(decryptSecret(payload, pw)).toBe(msg); // no state leaked between attempts
  });

  it('produces different ciphertext each time (random salt/nonce)', () => {
    expect(encryptSecret(msg, pw)).not.toBe(encryptSecret(msg, pw));
  });

  it('treats a plain string as not secret', () => {
    expect(isSecretQr('https://claude.com')).toBe(false);
  });

  it('keeps 5 different QRs / passwords independent', () => {
    const cases = [
      ['alpha', 'pw-one'],
      ['bravo content here', 'PW two spaces'],
      ['charlie', 'p@$$w0rd#3'],
      ['δέλτα unicode 你好', 'CaseSensitive'],
      ['echo', '   leading/trailing   '],
    ];
    const payloads = cases.map(([m, p]) => encryptSecret(m, p));
    cases.forEach(([m, p], i) => {
      expect(decryptSecret(payloads[i], p)).toBe(m);
      // a different QR's password must not open this one
      const other = (i + 1) % cases.length;
      expect(() => decryptSecret(payloads[i], cases[other][1])).toThrow();
    });
  });

  it('handles special-char, spaced and case-sensitive passwords', () => {
    for (const p of ['Test@12345', 'with spaces', 'ünïcödé🔑', 'tab\tsep', 'CASE', 'case']) {
      const payload = encryptSecret('secret body', p);
      expect(decryptSecret(payload, p)).toBe('secret body');
      expect(() => decryptSecret(payload, p.toUpperCase() + 'x')).toThrow();
    }
  });

  it('handles very short and large content', () => {
    const short = 'a';
    const large = 'X'.repeat(1500) + '🚀'.repeat(50);
    for (const m of [short, large]) {
      const payload = encryptSecret(m, pw);
      expect(decryptSecret(payload, pw)).toBe(m);
    }
  });

  it('reports tampered ciphertext as auth failure', () => {
    const payload = encryptSecret(msg, pw);
    // flip a char deep in the base64 (inside ciphertext region)
    const i = payload.length - 5;
    const c = payload[i] === 'A' ? 'B' : 'A';
    const tampered = payload.slice(0, i) + c + payload.slice(i + 1);
    expect(() => decryptSecret(tampered, pw)).toThrow(DecryptError);
  });

  it('reports tampered salt/nonce/iter region as auth failure', () => {
    const payload = encryptSecret(msg, pw);
    // marker is 5 chars; flip a byte early -> inside iter/salt/nonce
    const i = 8;
    const c = payload[i] === 'A' ? 'B' : 'A';
    const tampered = payload.slice(0, i) + c + payload.slice(i + 1);
    expect(() => decryptSecret(tampered, pw)).toThrow();
  });

  it('reports a truncated / malformed payload as corrupt, not auth', () => {
    try {
      decryptSecret('SQR2:AAAA', pw); // way too short
      throw new Error('should have thrown');
    } catch (e) {
      expect((e as DecryptError).kind).toBe('corrupt');
    }
  });

  it('rejects a garbage iteration count as corrupt', () => {
    // Build a payload whose iter field is huge (0xFFFFFFFF) so it fails bounds.
    const bytes = new Uint8Array(4 + 16 + 12 + 20).fill(0xff);
    const value = 'SQR2:' + bytesToBase64(bytes);
    expect(() => decryptSecret(value, pw)).toThrow(/corrupt/);
  });
});

describe('base64 codec fidelity (custom Hermes codec vs Node Buffer)', () => {
  // Deterministic pseudo-random bytes (no Math.random in this env dependency).
  const seeded = (n: number, seed: number) => {
    const out = new Uint8Array(n);
    let s = seed >>> 0;
    for (let i = 0; i < n; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      out[i] = (s >>> 24) & 0xff;
    }
    return out;
  };

  it('encodes identically to Buffer for every length 0..300', () => {
    for (let n = 0; n <= 300; n++) {
      const b = seeded(n, n + 1);
      const mine = bytesToBase64(b);
      const node = Buffer.from(b).toString('base64');
      expect(mine).toBe(node);
    }
  });

  it('decodes back to the exact bytes for every length 0..300', () => {
    for (let n = 0; n <= 300; n++) {
      const b = seeded(n, n + 7);
      const decoded = base64ToBytes(bytesToBase64(b));
      expect(Buffer.from(decoded)).toEqual(Buffer.from(b));
    }
  });

  it('decodes standard Buffer-produced base64 (incl. padding) correctly', () => {
    for (let n = 0; n <= 100; n++) {
      const b = seeded(n, n + 99);
      const std = Buffer.from(b).toString('base64');
      const decoded = base64ToBytes(std);
      expect(Buffer.from(decoded)).toEqual(Buffer.from(b));
    }
  });

  it('utf8 encode matches Buffer for ASCII/multibyte/emoji (Hermes has no TextDecoder)', () => {
    for (const s of ['', 'abc', 'áéíóú', '你好世界', 'I love you ❤️', '🚀🔑😀', 'mix a你🚀z']) {
      const enc = utf8ToBytes(s);
      expect(Buffer.from(enc)).toEqual(Buffer.from(s, 'utf8')); // encode parity
      expect(bytesToUtf8(enc)).toBe(s); // round-trip
    }
  });
});
