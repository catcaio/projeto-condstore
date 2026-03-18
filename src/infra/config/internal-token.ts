import crypto from 'node:crypto';
import { logger } from '../logger';
import {
  getAcceptedInternalTokens,
  getOfficialInternalTokens,
  isDevRuntimeEnvironment,
  isStrictRuntimeEnvironment,
  type InternalTokenPurpose,
} from './internal-token-contract';

let generatedDevToken: string | null = null;
let warned = false;

function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);

  if (aBuf.length !== bBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuf, bBuf);
}

function getDiagOrExportToken(): string | null {
  const diagToken = getOfficialInternalTokens('diag')[0];
  if (diagToken) return diagToken;

  const exportToken = getOfficialInternalTokens('export')[0];
  if (exportToken) return exportToken;

  return null;
}

export function getInternalExportTokenOrThrow(): string {
  const configured = getDiagOrExportToken();
  if (configured) return configured;

  if (isStrictRuntimeEnvironment()) {
    throw new Error('INTERNAL_DIAG_TOKEN or INTERNAL_EXPORT_TOKEN is required in staging/production runtimes');
  }

  if (!generatedDevToken) {
    generatedDevToken = crypto.randomBytes(24).toString('hex');
    process.env.INTERNAL_EXPORT_TOKEN = generatedDevToken;
    process.env.INTERNAL_DIAG_TOKEN = process.env.INTERNAL_DIAG_TOKEN || generatedDevToken;
  }

  if (!warned) {
    warned = true;
    logger.warn('internal_token_missing_dev_fallback', {
      generated: true,
      note: 'Using ephemeral INTERNAL_DIAG_TOKEN/INTERNAL_EXPORT_TOKEN fallback in development only',
    });
  }

  return generatedDevToken;
}

export function getInternalTokenForPurposeOrThrow(
  purpose: Exclude<InternalTokenPurpose, 'any' | 'qa_bootstrap'>,
): string {
  const configured = getAcceptedInternalTokens(purpose)[0];
  if (configured) return configured;

  if (purpose === 'export' || purpose === 'diag') {
    return getInternalExportTokenOrThrow();
  }

  throw new Error(`Missing internal token for purpose: ${purpose}`);
}

export function isInternalTokenAuthorized(token: string | null | undefined): boolean {
  if (token == null) {
    return false;
  }

  return getAcceptedInternalTokens('export').some(candidate => safeCompare(candidate, token))
    || getAcceptedInternalTokens('diag').some(candidate => safeCompare(candidate, token));
}

export { isDevRuntimeEnvironment, isStrictRuntimeEnvironment };
