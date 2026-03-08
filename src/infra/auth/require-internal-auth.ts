import { NextRequest, NextResponse } from 'next/server';
import { requireInternalToken, type InternalTokenPurpose } from './tenant-route-guard';
import { requireAdmin } from './guards';
import { safeCompare } from '@/lib/security/safe-compare';
import { structuredLogger } from '@/infra/log/logger';

export type InternalAuthResult =
    | { ok: true; source: 'internal_token' | 'admin_session' | 'bootstrap_token'; tenantId?: string }
    | { ok: false; response: NextResponse };

export interface InternalAuthOptions {
    /** Token purposes accepted for requireInternalToken */
    purpose?: InternalTokenPurpose[];
    /** Require BOOTSTRAP_TOKEN header in addition to internal token */
    requireBootstrapToken?: boolean;
    /** Block this route entirely in production (VERCEL_ENV=production) */
    blockInProduction?: boolean;
    /** Block this route unless running in dev mode (NODE_ENV=development) */
    blockUnlessDev?: boolean;
}

function isProductionEnv(): boolean {
    return process.env.VERCEL_ENV === 'production';
}

function isDevEnv(): boolean {
    return process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development';
}

/**
 * Unified internal auth guard.
 *
 * Tries, in order:
 * 1. Environment blocks (prod / dev-only)
 * 2. Internal token (x-internal-token header or ?token=)
 *    - Optionally validates x-bootstrap-token as well
 * 3. Fallback: admin session cookie
 *
 * At least one must pass; otherwise returns 401.
 */
export async function requireInternalAuth(
    request: NextRequest,
    options: InternalAuthOptions = {},
): Promise<InternalAuthResult> {
    const { purpose = ['any'], requireBootstrapToken = false, blockInProduction = false, blockUnlessDev = false } = options;

    // ── Environment gates ────────────────────────────────────────────
    if (blockInProduction && isProductionEnv()) {
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

    if (blockUnlessDev && !isDevEnv()) {
        return {
            ok: false,
            response: NextResponse.json(
                { error: 'FORBIDDEN', message: 'This endpoint is available in development mode only' },
                { status: 403 },
            ),
        };
    }

    // ── Internal token path ──────────────────────────────────────────
    const tokenResult = requireInternalToken(request, { purpose });

    if (tokenResult.ok) {
        // If bootstrap token is also required, validate it separately
        if (requireBootstrapToken) {
            const bootstrapToken = request.headers.get('x-bootstrap-token');
            const expectedBootstrapToken = process.env.BOOTSTRAP_TOKEN;

            if (!expectedBootstrapToken) {
                return {
                    ok: false,
                    response: NextResponse.json(
                        { error: 'SERVICE_UNAVAILABLE', message: 'Bootstrap token not configured' },
                        { status: 503 },
                    ),
                };
            }

            if (!safeCompare(bootstrapToken, expectedBootstrapToken)) {
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

    // ── QA token path (for qa_bootstrap purpose) ─────────────────────
    if (purpose.includes('qa_bootstrap') || purpose.includes('any')) {
        const qaToken = request.headers.get('x-qa-token') || request.nextUrl.searchParams.get('token');
        const serverQaToken = process.env.QA_BOOTSTRAP_TOKEN?.trim()
            || (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true'
                ? process.env.INTERNAL_TOKEN?.trim()
                : undefined);

        if (serverQaToken && qaToken && safeCompare(qaToken, serverQaToken)) {
            return { ok: true, source: 'bootstrap_token' };
        }
    }

    // ── Admin session fallback ───────────────────────────────────────
    const adminResult = await requireAdmin(request);
    if (adminResult.ok) {
        return { ok: true, source: 'admin_session', tenantId: adminResult.session.tenantId };
    }

    // ── All paths failed ─────────────────────────────────────────────
    return {
        ok: false,
        response: NextResponse.json(
            { error: 'UNAUTHORIZED', message: 'Internal token or admin session required' },
            { status: 401 },
        ),
    };
}
