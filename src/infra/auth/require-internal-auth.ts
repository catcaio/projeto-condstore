import { NextRequest, NextResponse } from 'next/server';
import { requireInternalToken, type InternalTokenPurpose } from './tenant-route-guard';
import { requireAdmin } from './guards';
import {
  extractInternalRequestCredentials,
  isBootstrapTokenAuthorized,
  isDevRuntimeEnvironment,
  isStrictRuntimeEnvironment,
} from '@/infra/config/internal-token-contract';
import { structuredLogger } from '@/infra/log/logger';

export type InternalAuthResult =
    | { ok: true; source: 'internal_token' | 'admin_session' | 'bootstrap_token'; tenantId?: string }
    | { ok: false; response: NextResponse };

export interface InternalAuthOptions {
    /** Token purposes accepted for requireInternalToken */
    purpose?: InternalTokenPurpose[];
    /** Require BOOTSTRAP_TOKEN header in addition to internal token */
    requireBootstrapToken?: boolean;
    /** Block this route entirely in production/staging runtimes */
    blockInProduction?: boolean;
    /** Block this route unless running in dev mode */
    blockUnlessDev?: boolean;
}

/**
 * Unified internal auth guard.
 *
 * Tries, in order:
 * 1. Environment blocks (strict runtime / dev-only)
 * 2. Internal token (x-internal-token or purpose-specific QA token)
 *    - Optionally validates x-bootstrap-token as well
 * 3. Fallback: admin session cookie
 */
export async function requireInternalAuth(
    request: NextRequest,
    options: InternalAuthOptions = {},
): Promise<InternalAuthResult> {
    const { purpose = ['any'], requireBootstrapToken = false, blockInProduction = false, blockUnlessDev = false } = options;

    if (blockInProduction && isStrictRuntimeEnvironment()) {
        structuredLogger.warn('internal_auth_blocked_production', {
            route: request.nextUrl.pathname,
            eventType: 'internal_auth',
        });
        return {
            ok: false,
            response: NextResponse.json(
                { error: 'FORBIDDEN', message: 'Not allowed in production' },
                { status: 403 },
            ),
        };
    }

    if (blockUnlessDev && !isDevRuntimeEnvironment()) {
        return {
            ok: false,
            response: NextResponse.json(
                { error: 'FORBIDDEN', message: 'This endpoint is available in development mode only' },
                { status: 403 },
            ),
        };
    }

    const credentials = extractInternalRequestCredentials(request);
    const tokenResult = requireInternalToken(request, { purpose });

    if (tokenResult.ok) {
        if (requireBootstrapToken) {
            if (!process.env.BOOTSTRAP_TOKEN?.trim()) {
                return {
                    ok: false,
                    response: NextResponse.json(
                        { error: 'SERVICE_UNAVAILABLE', message: 'Bootstrap token not configured' },
                        { status: 503 },
                    ),
                };
            }

            if (!isBootstrapTokenAuthorized(credentials.bootstrapToken)) {
                structuredLogger.warn('internal_auth_bootstrap_token_mismatch', {
                    route: request.nextUrl.pathname,
                    eventType: 'internal_auth',
                });
                return {
                    ok: false,
                    response: NextResponse.json(
                        { error: 'UNAUTHORIZED', message: 'Bootstrap token missing or invalid' },
                        { status: 401 },
                    ),
                };
            }
        }

        return { ok: true, source: 'internal_token' };
    }

    const adminResult = await requireAdmin(request);
    if (adminResult.ok) {
        return { ok: true, source: 'admin_session', tenantId: adminResult.session.tenantId };
    }

    return {
        ok: false,
        response: NextResponse.json(
            { error: 'UNAUTHORIZED', message: 'Internal token or admin session required' },
            { status: 401 },
        ),
    };
}
