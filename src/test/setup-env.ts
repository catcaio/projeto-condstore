/**
 * Vitest global setup — TEST-ONLY environment variables.
 *
 * ⚠️  These values are FAKE, deterministic, and MUST NEVER appear in real
 *     production, preview, or staging environments.
 *
 * Purpose:
 *  - Prevent MISSING_PII_ENCRYPTION_KEY from aborting tests that call
 *    encryptString() / decryptString() via real code paths.
 *  - PII_ENCRYPTION_KEY must be 64 hex chars (32 bytes).
 *    The value below is intentionally trivial and publicly documented here.
 *
 * Rule: do NOT commit real secrets. This file must not reference production
 *       or preview keys. lint:secrets-critical will flag real keys if added.
 */

// Test-only 256-bit key: 64 hex zeros — NOT a real secret.
const TEST_ONLY_PII_ENCRYPTION_KEY = '0'.repeat(64);

if (!process.env.PII_ENCRYPTION_KEY) {
  process.env.PII_ENCRYPTION_KEY = TEST_ONLY_PII_ENCRYPTION_KEY;
}

// Ensure AUTH_SECRET is set so getAuthSecretValue() does not throw or warn.
if (!process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = 'test-auth-secret-minimum-32-chars-!!';
}

// Keep NODE_ENV as 'test' — isDevelopmentRuntimeStrict() checks for
// 'development' only, but PII_ENCRYPTION_KEY is now explicitly set above
// so the development-fallback branch is never reached in tests.
// We do NOT override NODE_ENV here to avoid breaking other test assertions
// that depend on NODE_ENV === 'test'.
