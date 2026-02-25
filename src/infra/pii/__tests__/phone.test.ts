import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { deriveTenantPhoneSalt, normalizeE164, phoneHash } from '../phone';

describe('pii/phone', () => {
  const originalAuthSecret = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-auth-secret';
  });

  afterEach(() => {
    if (originalAuthSecret === undefined) {
      delete process.env.AUTH_SECRET;
    } else {
      process.env.AUTH_SECRET = originalAuthSecret;
    }
  });

  it('normalizes Twilio WhatsApp phone values to E.164', () => {
    expect(normalizeE164(' whatsapp:+55 11 98765-4321 ')).toBe('+5511987654321');
  });

  it('produces deterministic hash for same tenant and phone', () => {
    const e164 = normalizeE164('whatsapp:+5511987654321');
    const tenantSalt = deriveTenantPhoneSalt('tenant-1');

    expect(phoneHash(e164, tenantSalt)).toBe(phoneHash(e164, tenantSalt));
  });

  it('changes hash across tenants for same phone', () => {
    const e164 = normalizeE164('+5511987654321');
    const hashA = phoneHash(e164, deriveTenantPhoneSalt('tenant-a'));
    const hashB = phoneHash(e164, deriveTenantPhoneSalt('tenant-b'));

    expect(hashA).not.toBe(hashB);
  });
});
