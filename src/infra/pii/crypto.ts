import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { isDevelopmentRuntimeStrict, readTrimmedEnv } from '../env/critical-runtime';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const VERSION_PREFIX = 'v1:';
let warnedMissingKey = false;

function parseConfiguredKey(raw: string): Buffer {
  const value = raw.trim();

  if (/^[a-fA-F0-9]{64}$/.test(value)) {
    return Buffer.from(value, 'hex');
  }

  const decoded = Buffer.from(value, 'base64');
  if (decoded.length !== 32) {
    throw new Error('INVALID_PII_ENCRYPTION_KEY_LENGTH');
  }
  return decoded;
}

export function getPiiEncryptionKey(): Buffer {
  const configured = readTrimmedEnv('PII_ENCRYPTION_KEY');
  if (configured) {
    return parseConfiguredKey(configured);
  }

  if (!isDevelopmentRuntimeStrict()) {
    throw new Error('MISSING_PII_ENCRYPTION_KEY');
  }

  if (!warnedMissingKey) {
    warnedMissingKey = true;
    console.warn('[pii] PII_ENCRYPTION_KEY missing in NODE_ENV=development; using dev-only fallback encryption key');
  }

  // Deterministic dev/test fallback to keep roundtrip behavior stable in local runs.
  return createHash('sha256').update('dev-only-pii-encryption-key').digest();
}

export function isEncryptedString(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(VERSION_PREFIX);
}

export function encryptString(plaintext: string): string {
  const key = getPiiEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${VERSION_PREFIX}${Buffer.concat([iv, tag, ciphertext]).toString('base64')}`;
}

export function decryptString(payload: string): string {
  if (!isEncryptedString(payload)) {
    throw new Error('INVALID_PII_CIPHERTEXT_FORMAT');
  }

  const encoded = payload.slice(VERSION_PREFIX.length);
  const binary = Buffer.from(encoded, 'base64');
  if (binary.length < IV_BYTES + TAG_BYTES) {
    throw new Error('INVALID_PII_CIPHERTEXT_LENGTH');
  }

  const iv = binary.subarray(0, IV_BYTES);
  const tag = binary.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = binary.subarray(IV_BYTES + TAG_BYTES);

  const decipher = createDecipheriv(ALGORITHM, getPiiEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}
