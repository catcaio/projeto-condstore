/**
 * Melhor Envio Webhook Signature Verifier.
 *
 * Validates webhook authenticity using a shared secret token.
 * Melhor Envio sends the secret in the `x-secret` header (or via query param).
 * The expected secret is configured via MELHORENVIO_WEBHOOK_SECRET env var.
 */

import { NextRequest } from 'next/server';
import { safeCompare } from '@/lib/security/safe-compare';
import { structuredLogger } from '@/infra/log/logger';

export interface MelhorEnvioVerificationResult {
    valid: boolean;
    reason?: 'secret_not_configured' | 'missing_secret' | 'invalid_secret';
}

/**
 * Verifies that a Melhor Envio webhook request is authentic.
 *
 * Checks the `x-secret` header (preferred) or `secret` query param
 * against MELHORENVIO_WEBHOOK_SECRET environment variable.
 */
export function verifyMelhorEnvioWebhook(request: NextRequest): MelhorEnvioVerificationResult {
    const expectedSecret = process.env.MELHORENVIO_WEBHOOK_SECRET?.trim();

    if (!expectedSecret) {
        structuredLogger.error('melhorenvio_webhook_secret_not_configured', {
            eventType: 'webhook_misconfigured',
            route: '/api/webhooks/melhor-envio',
        });
        return { valid: false, reason: 'secret_not_configured' };
    }

    const providedSecret =
        request.headers.get('x-secret') ??
        request.nextUrl.searchParams.get('secret') ??
        null;

    if (!providedSecret) {
        return { valid: false, reason: 'missing_secret' };
    }

    if (!safeCompare(providedSecret, expectedSecret)) {
        structuredLogger.warn('melhorenvio_webhook_invalid_secret', {
            eventType: 'webhook_auth_failed',
            route: '/api/webhooks/melhor-envio',
        });
        return { valid: false, reason: 'invalid_secret' };
    }

    return { valid: true };
}
