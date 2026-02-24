import crypto from 'node:crypto';
import { logger } from '@/infra/logger';

let generatedDevToken: string | null = null;
let warned = false;

function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function getInternalExportTokenOrThrow(): string {
  const configured = process.env.INTERNAL_EXPORT_TOKEN?.trim();
  if (configured) return configured;

  if (isProd()) {
    throw new Error('INTERNAL_EXPORT_TOKEN is required in production');
  }

  if (!generatedDevToken) {
    generatedDevToken = crypto.randomBytes(24).toString('hex');
    process.env.INTERNAL_EXPORT_TOKEN = generatedDevToken;
  }

  if (!warned) {
    warned = true;
    logger.warn('internal_export_token_missing_dev_fallback', {
      generated: true,
      note: 'Using ephemeral INTERNAL_EXPORT_TOKEN fallback in development only',
    });
  }

  return generatedDevToken;
}

export function isInternalTokenAuthorized(token: string | null | undefined): boolean {
  try {
    const expected = getInternalExportTokenOrThrow();
    return Boolean(token && token === expected);
  } catch {
    return false;
  }
}
