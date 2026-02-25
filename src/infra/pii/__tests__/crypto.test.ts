import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { decryptString, encryptString, isEncryptedString } from '../crypto';

describe('pii/crypto', () => {
  const originalKey = process.env.PII_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.PII_ENCRYPTION_KEY = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
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
});
