#!/usr/bin/env node

/**
 * CI health check for critical secrets.
 * Scope intentionally minimal:
 * - AUTH_SECRET must exist and must not be a known dev fallback.
 * - PII_ENCRYPTION_KEY must exist outside development and have 32-byte hex format.
 */

const nodeEnv = (process.env.NODE_ENV || '').trim().toLowerCase();
const isDevelopment = nodeEnv === 'development';

const knownAuthFallbacks = new Set([
  'dev-only-fallback-secret-do-not-use-in-prod',
  'dev-only-auth-secret-do-not-use-in-prod',
]);

const errors = [];

function readEnv(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

const authSecret = readEnv('AUTH_SECRET');
if (!authSecret) {
  errors.push('AUTH_SECRET is missing');
} else if (knownAuthFallbacks.has(authSecret)) {
  errors.push('AUTH_SECRET is using a forbidden dev fallback value');
}

if (!isDevelopment) {
  const piiKey = readEnv('PII_ENCRYPTION_KEY');
  if (!piiKey) {
    errors.push('PII_ENCRYPTION_KEY is missing outside development');
  } else if (!/^[0-9a-fA-F]{64}$/.test(piiKey)) {
    errors.push('PII_ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
  }
}

if (errors.length > 0) {
  console.error('[critical-secrets] FAILED');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('[critical-secrets] OK');
