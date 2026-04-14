#!/usr/bin/env node

/**
 * CI health check for critical env vars.
 * Outside NODE_ENV=development we fail hard on:
 * - missing AUTH_SECRET, DATABASE_URL or PII_ENCRYPTION_KEY
 * - known hardcoded / placeholder values
 * - weak AUTH_SECRET values (< 32 bytes)
 * - invalid PII_ENCRYPTION_KEY format (< 32 bytes or not a valid 32-byte key)
 */

import { pathToFileURL } from 'node:url';

const AUTH_SECRET_MIN_BYTES = 32;
const PII_KEY_BYTES = 32;
const DEV_ONLY_DATABASE_URL_FALLBACK = 'mysql://root:root@localhost:3306/condstore_dev';

const knownAuthFallbacks = new Set([
  'dev-only-fallback-secret-do-not-use-in-prod',
  'dev-only-auth-secret-do-not-use-in-prod',
  'ci-only-auth-secret-quality-gate',
  'dev-secret-ci',
]);

const knownPiiFallbacks = new Set([
  'dev-only-pii-encryption-key',
  '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
]);

const insecurePlaceholderPatterns = [
  /changeme/i,
  /change-this/i,
  /placeholder/i,
  /dummy/i,
  /example/i,
  /replace-me/i,
  /^test-secret/i,
];

function readEnv(env, name) {
  const value = env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function looksLikePlaceholder(value) {
  return insecurePlaceholderPatterns.some((pattern) => pattern.test(value));
}

function parsePiiKeyLength(value) {
  if (/^[0-9a-fA-F]{64}$/.test(value)) {
    return Buffer.from(value, 'hex').length;
  }

  return Buffer.from(value, 'base64').length;
}

export function validateCriticalSecrets(env = process.env) {
  const errors = [];
  const runtimeEnv = readEnv(env, 'NODE_ENV').toLowerCase();
  const developmentMode = runtimeEnv === 'development';

  const authSecret = readEnv(env, 'AUTH_SECRET');
  if (!authSecret) {
    if (!developmentMode) {
      errors.push('AUTH_SECRET is missing outside NODE_ENV=development');
    }
  } else {
    if (knownAuthFallbacks.has(authSecret) || looksLikePlaceholder(authSecret)) {
      errors.push('AUTH_SECRET is using a forbidden fallback or placeholder value');
    }

    if (Buffer.byteLength(authSecret, 'utf8') < AUTH_SECRET_MIN_BYTES) {
      errors.push(`AUTH_SECRET must be at least ${AUTH_SECRET_MIN_BYTES} bytes`);
    }
  }

  const databaseUrl = readEnv(env, 'DATABASE_URL');
  if (!databaseUrl) {
    errors.push('DATABASE_URL is missing');
  } else if (!developmentMode && databaseUrl === DEV_ONLY_DATABASE_URL_FALLBACK) {
    errors.push('DATABASE_URL is using the forbidden local default fallback');
  }

  const piiKey = readEnv(env, 'PII_ENCRYPTION_KEY');
  if (!piiKey) {
    if (!developmentMode) {
      errors.push('PII_ENCRYPTION_KEY is missing outside NODE_ENV=development');
    }
  } else {
    if (knownPiiFallbacks.has(piiKey) || looksLikePlaceholder(piiKey)) {
      errors.push('PII_ENCRYPTION_KEY is using a forbidden fallback or placeholder value');
    }

    const decodedLength = parsePiiKeyLength(piiKey);
    if (decodedLength !== PII_KEY_BYTES) {
      errors.push(
        `PII_ENCRYPTION_KEY must decode to exactly ${PII_KEY_BYTES} bytes (minimum entropy requirement is ${PII_KEY_BYTES} bytes)`,
      );
    }
  }

  return errors;
}

function run() {
  const errors = validateCriticalSecrets(process.env);

  if (errors.length > 0) {
    console.error('[critical-secrets] FAILED');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('[critical-secrets] OK');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}
