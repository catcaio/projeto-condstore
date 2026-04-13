const textEncoder = new TextEncoder();

export const AUTH_SECRET_MIN_BYTES = 32;
export const DEV_ONLY_AUTH_SECRET_FALLBACK = 'dev-only-fallback-secret-do-not-use-in-prod';
export const LEGACY_DEV_ONLY_AUTH_SECRET_FALLBACK = 'dev-only-auth-secret-do-not-use-in-prod';
export const DEV_ONLY_DATABASE_URL_FALLBACK = 'mysql://root:root@localhost:3306/condstore_dev';

const warnedFallbacks = new Set<string>();
const forbiddenAuthSecretValues = new Set([
  DEV_ONLY_AUTH_SECRET_FALLBACK,
  LEGACY_DEV_ONLY_AUTH_SECRET_FALLBACK,
]);

function warnOnce(key: string, message: string) {
  if (warnedFallbacks.has(key)) {
    return;
  }

  warnedFallbacks.add(key);
  console.warn(message);
}

export function isDevelopmentRuntimeStrict(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function readTrimmedEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function getAuthSecretValue(): string {
  const configured = readTrimmedEnv('AUTH_SECRET');
  if (configured) {
    if (!isDevelopmentRuntimeStrict() && forbiddenAuthSecretValues.has(configured)) {
      throw new Error('INSECURE_AUTH_SECRET');
    }

    return configured;
  }

  if (isDevelopmentRuntimeStrict()) {
    warnOnce(
      'AUTH_SECRET',
      '[auth] AUTH_SECRET missing in NODE_ENV=development; using dev-only fallback secret',
    );
    return DEV_ONLY_AUTH_SECRET_FALLBACK;
  }

  throw new Error('MISSING_AUTH_SECRET');
}

export function getAuthSecretBytes(): Uint8Array {
  return textEncoder.encode(getAuthSecretValue());
}

export function requireDatabaseUrl(): string {
  const databaseUrl = readTrimmedEnv('DATABASE_URL');
  if (!databaseUrl) {
    throw new Error('MISSING_DATABASE_URL');
  }

  if (!isDevelopmentRuntimeStrict() && databaseUrl === DEV_ONLY_DATABASE_URL_FALLBACK) {
    throw new Error('INSECURE_DATABASE_URL');
  }

  return databaseUrl;
}
