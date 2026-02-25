import crypto from 'node:crypto';
import { logger } from '../logger';

let generatedDevToken: string | null = null;
let warned = false;

function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Validate token has minimum strength (≥32 characters) in production
 */
function validateTokenStrength(token: string): boolean {
  if (isProd()) {
    // Production tokens must be at least 32 characters
    if (token.length < 32) {
      return false;
    }

    // Ensure token has reasonable entropy (alphanumeric/hex)
    if (!/^[a-zA-Z0-9]+$/.test(token)) {
      return false;
    }
  }
  return true;
}

/**
 * Timing-safe comparison of tokens to prevent timing attacks
 */
function timingSafeEqual(a: string | null | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;

  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    // Buffers have different lengths or other comparison error
    return false;
  }
}

export function getInternalExportTokenOrThrow(): string {
  const configured = process.env.INTERNAL_EXPORT_TOKEN?.trim();
  if (configured) {
    if (!validateTokenStrength(configured)) {
      throw new Error('INTERNAL_EXPORT_TOKEN has insufficient strength in production');
    }
    return configured;
  }

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
    return timingSafeEqual(token, expected);
  } catch (err) {
    logger.debug('internal_token_validation_error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
