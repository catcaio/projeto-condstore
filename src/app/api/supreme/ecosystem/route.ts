export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/supreme/ecosystem
 * ─────────────────────────────────────────────────────────────────────────────
 * Frank Supremo — Ecosystem Map (read-only, cross-tenant).
 *
 * Auth (dupla — satisfaz qualquer um):
 *   A) x-internal-token válido (INTERNAL_EXPORT_TOKEN / INTERNAL_DIAG_TOKEN)
 *   B) JWT session com role = "super_admin"
 *
 * Rate limit: sem rate limit próprio — protegido pelo token/role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEcosystemMap } from '../../../../core/supreme/ecosystem-map.service';
import { requireInternalToken } from '../../../../infra/auth/tenant-route-guard';
import { getSessionUser } from '../../../../infra/auth/session';
import { makeRequestId, attachRequestIdHeader } from '../../../../infra/http/request-trace';
import { ErrorCode, errorResponse } from '../../../../infra/http/error-response';
import { structuredLogger } from '../../../../infra/log/logger';

// ── Auth helper ──────────────────────────────────────────────────────────────

async function isAuthorized(request: NextRequest): Promise<boolean> {
    // Path A: x-internal-token
    const authResult = requireInternalToken(request, { purpose: ['export', 'diag'] });
    if (authResult.ok) return true;

    // Path B: session role = super_admin
    try {
        const session = await getSessionUser(request);
        if (session?.role === 'super_admin') return true;
    } catch {
        // session unavailable
    }

    return false;
}

// ── Handler ──────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
    const startedAt = Date.now();
    const requestId = makeRequestId(request);
    const route = '/api/supreme/ecosystem';

    structuredLogger.info('supreme_ecosystem_start', {
        requestId,
        route,
        eventType: 'SUPREME_VIEW',
    });

    // ── Auth ─────────────────────────────────────────────────────────────────
    if (!await isAuthorized(request)) {
        structuredLogger.warn('supreme_ecosystem_unauthorized', {
            requestId,
            route,
            eventType: 'SUPREME_VIEW',
        });
        return errorResponse(ErrorCode.AUTH_REQUIRED, 401, requestId, 'Unauthorized');
    }

    // ── Collect ───────────────────────────────────────────────────────────────
    try {
        const map = await getEcosystemMap();

        const latencyMs = Date.now() - startedAt;

        structuredLogger.info('supreme_ecosystem_end', {
            requestId,
            route,
            eventType: 'SUPREME_VIEW',
            latencyMs,
            tenantTotal: map.tenants.total,
            finopsLocked: map.finops.locked,
        });

        const response = NextResponse.json({ ok: true, data: map }, { status: 200 });
        attachRequestIdHeader(response, requestId);
        return response;

    } catch (err) {
        structuredLogger.error('supreme_ecosystem_error', {
            requestId,
            route,
            eventType: 'SUPREME_VIEW',
            latencyMs: Date.now() - startedAt,
            errorCode: ErrorCode.UNKNOWN,
            error: err,
        });
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Ecosystem map collection failed');
    }
}
