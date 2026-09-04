import { gcm } from '@noble/ciphers/aes.js';
import { randomBytes, utf8ToBytes, bytesToUtf8, concatBytes } from '@noble/ciphers/utils.js';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

/**
 * Password-protected QR payloads. Uses AES-256-GCM (authenticated encryption)
 * from the audited, dependency-free @noble/ciphers — no custom crypto. The key
 * is derived from the password with PBKDF2-SHA256. Everything runs on-device;
 * no plaintext or password leaves the app.
 *
 * Wire format (all binary, then base64, prefixed with a marker):
 *   MARKER + base64( salt[16] | nonce[12] | ciphertext+gcmTag )
 * The marker lets the scanner tell a Secret QR apart from a normal one.
 */
const MARKER = 'SQR1:';
const SALT_LEN = 16;
const NONCE_LEN = 12;
const KEY_LEN = 32; // AES-256
const ITERATIONS = 150_000;

const deriveKey = (password: string, salt: Uint8Array) =>
  pbkdf2(sha256, utf8ToBytes(password), salt, { c: ITERATIONS, dkLen: KEY_LEN });

/** True if a decoded QR value is one of our encrypted payloads. */
export const isSecretQr = (value: string) => value.startsWith(MARKER);

/** Encrypt a message into a Secret-QR payload string. */
export function encryptSecret(message: string, password: string): string {
  const salt = randomBytes(SALT_LEN);
  const nonce = randomBytes(NONCE_LEN);
  const key = deriveKey(password, salt);
  const ct = gcm(key, nonce).encrypt(utf8ToBytes(message));
  return MARKER + bytesToBase64(concatBytes(salt, nonce, ct));
}

/**
 * Decrypt a Secret-QR payload. Throws if the password is wrong or the data is
 * corrupt (GCM authentication failure) — callers surface a friendly message.
 */
export function decryptSecret(value: string, password: string): string {
  const packed = base64ToBytes(value.slice(MARKER.length));
  if (packed.length <= SALT_LEN + NONCE_LEN) throw new Error('corrupt');
  const salt = packed.slice(0, SALT_LEN);
  const nonce = packed.slice(SALT_LEN, SALT_LEN + NONCE_LEN);
  const ct = packed.slice(SALT_LEN + NONCE_LEN);
  const key = deriveKey(password, salt);
  return bytesToUtf8(gcm(key, nonce).decrypt(ct));
}

// --- base64 for Uint8Array (Hermes has no Buffer; keep encoding self-contained) ---
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64[a >> 2] + B64[((a & 3) << 4) | (b >> 4)];
    out += i + 1 < bytes.length ? B64[((b & 15) << 2) | (c >> 6)] : '=';
    out += i + 2 < bytes.length ? B64[c & 63] : '=';
  }
  return out;
}

function base64ToBytes(str: string): Uint8Array {
  const clean = str.replace(/[^A-Za-z0-9+/]/g, '');
  const len = Math.floor((clean.length * 3) / 4);
  const out = new Uint8Array(len);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      (B64.indexOf(clean[i]) << 18) |
      (B64.indexOf(clean[i + 1]) << 12) |
      ((clean[i + 2] ? B64.indexOf(clean[i + 2]) : 0) << 6) |
      (clean[i + 3] ? B64.indexOf(clean[i + 3]) : 0);
    if (p < len) out[p++] = (n >> 16) & 0xff;
    if (p < len) out[p++] = (n >> 8) & 0xff;
    if (p < len) out[p++] = n & 0xff;
  }
  return out;
}
