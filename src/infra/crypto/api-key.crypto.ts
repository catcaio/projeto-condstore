/**
 * api-key.crypto.ts
 *
 * AES-256-GCM envelope para armazenamento seguro de API keys de providers de IA.
 *
 * Formato de saída: "v1:{iv_hex}:{authTag_hex}:{ciphertext_hex}"
 * Key source: env PROVIDER_SECRETS_KEY — 64 chars hex (= 32 bytes)
 *
 * Compatibilidade retroativa:
 *   decryptApiKey(value) onde value NÃO começa com "v1:" → retorna value intacto
 *   (plaintext legado durante janela de migração)
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;   // 96-bit IV recomendado para GCM
const TAG_BYTES = 16;  // 128-bit auth tag

// Dedup: warn de chave ausente apenas 1x por processo
let _keyMissingWarned = false;

function getKey(): Buffer | null {
  const raw = process.env.PROVIDER_SECRETS_KEY;
  if (!raw) {
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      throw new Error('MISSING_CRYPTO_KEY: PROVIDER_SECRETS_KEY é obrigatória em produção');
    }
    if (!_keyMissingWarned) {
      _keyMissingWarned = true;
      console.warn(
        '[crypto] PROVIDER_SECRETS_KEY não definida em dev — apiKey NÃO será criptografada. ' +
        'Adicione ao .env.local para testar encryption.'
      );
    }
    return null;
  }
  if (raw.length !== 64) {
    throw new Error(
      `PROVIDER_SECRETS_KEY deve ter 64 caracteres hex (32 bytes). Atual: ${raw.length} chars.`
    );
  }
  return Buffer.from(raw, 'hex');
}

/**
 * Criptografa uma API key em texto puro.
 * Retorna null se PROVIDER_SECRETS_KEY não estiver configurada (dev sem key).
 */
export function encryptApiKey(plain: string): string | null {
  if (!plain) return null;
  const key = getKey();
  if (!key) return null;

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${ct.toString('hex')}`;
}

/**
 * Decriptografa uma API key armazenada.
 * Se o valor não começa com "v1:", retorna-o intacto (compat. plaintext legado).
 */
export function decryptApiKey(enc: string): string {
  if (!enc || !enc.startsWith('v1:')) return enc;

  const key = getKey();
  if (!key) {
    // Dev sem key: não conseguimos decriptar — retorna ciphertext como fallback
    // (não deve ser usado como API key real, apenas evita crash no dev)
    console.warn('[crypto] Não é possível decriptar apiKey sem PROVIDER_SECRETS_KEY');
    return enc;
  }

  const parts = enc.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error(`Formato inválido de apiKey criptografada: ${enc.slice(0, 20)}...`);
  }

  const iv = Buffer.from(parts[1], 'hex');
  const tag = Buffer.from(parts[2], 'hex');
  const ct = Buffer.from(parts[3], 'hex');

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plain.toString('utf8');
}

/**
 * Verifica se um valor está no formato de ciphertext v1.
 */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith('v1:');
}
