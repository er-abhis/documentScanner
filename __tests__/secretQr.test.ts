// Node (jest env) provides global crypto.getRandomValues; the RN polyfill
// (react-native-get-random-values, loaded in index.js) is only needed on device.
import { encryptSecret, decryptSecret, isSecretQr } from '../src/services/crypto/secretQr';

describe('secretQr AES-256-GCM', () => {
  const msg = 'I love you ❤️';
  const pw = 'correct horse';

  it('round-trips a message with the right password', () => {
    const payload = encryptSecret(msg, pw);
    expect(isSecretQr(payload)).toBe(true);
    expect(payload).not.toContain(msg); // ciphertext, not plaintext
    expect(decryptSecret(payload, pw)).toBe(msg);
  });

  it('rejects a wrong password (auth failure)', () => {
    const payload = encryptSecret(msg, pw);
    expect(() => decryptSecret(payload, 'nope')).toThrow();
  });

  it('produces different ciphertext each time (random salt/nonce)', () => {
    expect(encryptSecret(msg, pw)).not.toBe(encryptSecret(msg, pw));
  });

  it('treats a plain string as not secret', () => {
    expect(isSecretQr('https://claude.com')).toBe(false);
  });
});
