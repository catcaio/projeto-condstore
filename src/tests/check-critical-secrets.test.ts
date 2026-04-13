import { describe, expect, it } from 'vitest';
import { validateCriticalSecrets } from '../../scripts/check-critical-secrets.mjs';

describe('check-critical-secrets', () => {
  it('rejects weak AUTH_SECRET values and forbidden database fallbacks outside development', () => {
    const errors = validateCriticalSecrets({
      NODE_ENV: 'production',
      AUTH_SECRET: 'short-secret',
      DATABASE_URL: 'mysql://root:root@localhost:3306/condstore_dev',
      PII_ENCRYPTION_KEY: '6f2d2a4d8f9e6ab34b45d8b0d2e53c4a7b198d4f5566778899aabbccddeeff01',
    });

    expect(errors).toEqual(expect.arrayContaining([
      'AUTH_SECRET must be at least 32 bytes',
      'DATABASE_URL is using the forbidden local default fallback',
    ]));
  });

  it('rejects placeholder or invalid PII keys outside development', () => {
    const errors = validateCriticalSecrets({
      NODE_ENV: 'production',
      AUTH_SECRET: 'auth-secret-with-at-least-32-bytes',
      DATABASE_URL: 'mysql://ci_user:ci_password@127.0.0.1:3306/condstore_ci',
      PII_ENCRYPTION_KEY: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
    });

    expect(errors).toContain('PII_ENCRYPTION_KEY is using a forbidden fallback or placeholder value');
  });
});
