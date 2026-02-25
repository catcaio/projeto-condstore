import { createHash, createHmac } from 'node:crypto';

const DEV_AUTH_SECRET_FALLBACK = 'dev-only-auth-secret-do-not-use-in-prod';
let warnedMissingAuthSecret = false;

function getHashingSecret(): string {
  const configured = process.env.AUTH_SECRET?.trim();
  if (configured) return configured;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('MISSING_AUTH_SECRET_FOR_PII_HASH');
  }

  if (!warnedMissingAuthSecret) {
    warnedMissingAuthSecret = true;
    console.warn('[pii] AUTH_SECRET missing in dev/test; using insecure fallback for phone hashing');
  }

  return DEV_AUTH_SECRET_FALLBACK;
}

export function normalizeE164(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('INVALID_PHONE_INPUT');
  }

  let value = input.trim();
  if (!value) {
    throw new Error('INVALID_PHONE_EMPTY');
  }

  value = value.replace(/^whatsapp:/i, '').trim();
  value = value.replace(/[\s().-]/g, '');

  if (!value.startsWith('+')) {
    value = `+${value.replace(/[^\d]/g, '')}`;
  } else {
    value = `+${value.slice(1).replace(/[^\d]/g, '')}`;
  }

  if (!/^\+\d{8,15}$/.test(value)) {
    throw new Error('INVALID_PHONE_FORMAT');
  }

  return value;
}

export function deriveTenantPhoneSalt(tenantId: string): string {
  const normalizedTenantId = tenantId?.trim();
  if (!normalizedTenantId) {
    throw new Error('INVALID_TENANT_ID_FOR_PHONE_HASH');
  }

  return createHmac('sha256', getHashingSecret()).update(normalizedTenantId).digest('hex');
}

export function phoneHash(e164: string, tenantSalt: string): string {
  const normalizedPhone = normalizeE164(e164);
  const salt = tenantSalt?.trim();
  if (!salt) {
    throw new Error('INVALID_TENANT_SALT_FOR_PHONE_HASH');
  }

  return createHash('sha256').update(`${salt}:${normalizedPhone}`).digest('hex');
}

export function hashPhoneForTenant(input: string, tenantId: string): { e164: string; hash: string } {
  const e164 = normalizeE164(input);
  const tenantSalt = deriveTenantPhoneSalt(tenantId);
  return {
    e164,
    hash: phoneHash(e164, tenantSalt),
  };
}
