import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { tenantSecretsRepository } from '@/infra/repositories/tenant-secrets.repository';
import { rateLimiter, applyRateLimitHeaders } from '@/infra/security/rate-limiter';
import { makeRequestId } from '@/infra/http/request-trace';

import { extractTenantIdFromTenantRoute, getAuthContext } from '@/infra/auth/tenant-route-guard';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { structuredLogger } from '@/infra/log/logger';

async function _GET(req: NextRequest, { params }: { params: Promise<{ tenantId: string  }> }) {
    const requestId = makeRequestId(req);
    const tenantIdFromRoute = extractTenantIdFromTenantRoute(req);

    // 1. Session and Tenant Match
    const guard = await getAuthContext(req, tenantIdFromRoute);
    if (!guard.ok) return guard.response;

    // 2. Admin verification
    if (guard.sessionUser.role !== 'admin') {
        return errorResponse(ErrorCode.FORBIDDEN, 403, requestId, 'Forbidden');
    }

    // Rate Limiter
    const rlDecision = await rateLimiter.limit('secrets.get', guard.tenantId, {
        max: 100,
        windowSec: 60,
    });

    if (!rlDecision.allowed) {
        const res = NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        return applyRateLimitHeaders(res, rlDecision);
    }

    try {
        const metadataList = await tenantSecretsRepository.getMetadataByTenant(guard.tenantId);

        const res = NextResponse.json({ secrets: metadataList });
        return applyRateLimitHeaders(res, rlDecision);
    } catch (error: any) {
        structuredLogger.error('Failed to get secrets metadata', { err: error.message, tenantId: guard.tenantId ?? (await params).tenantId, requestId });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export const GET = withGlobalErrorInterceptor(_GET);
