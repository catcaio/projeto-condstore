import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decryptString, encryptString, isEncryptedString } from '../crypto';

describe('pii/crypto', () => {
  const originalKey = process.env.PII_ENCRYPTION_KEY;

  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('NODE_ENV', 'test');
    process.env.PII_ENCRYPTION_KEY = '6f2d2a4d8f9e6ab34b45d8b0d2e53c4a7b198d4f5566778899aabbccddeeff01';
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.PII_ENCRYPTION_KEY;
    } else {
      process.env.PII_ENCRYPTION_KEY = originalKey;
    }
  });

  it('encrypts/decrypts roundtrip with AES-GCM', () => {
    const ciphertext = encryptString('conteudo sensivel');

    expect(isEncryptedString(ciphertext)).toBe(true);
    expect(ciphertext).not.toContain('conteudo sensivel');
    expect(decryptString(ciphertext)).toBe('conteudo sensivel');
  });

  it('fails fast outside development when the key is missing', () => {
    delete process.env.PII_ENCRYPTION_KEY;

    expect(() => encryptString('conteudo sensivel')).toThrow('MISSING_PII_ENCRYPTION_KEY');
  });

  it('rejects insecure keys that do not decode to 32 bytes', () => {
    process.env.PII_ENCRYPTION_KEY = 'short-key';

    expect(() => encryptString('conteudo sensivel')).toThrow('INVALID_PII_ENCRYPTION_KEY_LENGTH');
  });

  it('preserves the development fallback only for NODE_ENV=development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    delete process.env.PII_ENCRYPTION_KEY;

    const ciphertext = encryptString('conteudo sensivel');

    expect(isEncryptedString(ciphertext)).toBe(true);
    expect(decryptString(ciphertext)).toBe('conteudo sensivel');
  });
});
