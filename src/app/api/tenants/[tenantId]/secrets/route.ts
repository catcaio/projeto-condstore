import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { tenantSecretsRepository } from '@/infra/repositories/tenant-secrets.repository';
import { rateLimiter, applyRateLimitHeaders } from '@/infra/security/rate-limiter';
import { makeRequestId } from '@/infra/http/request-trace';

export async function GET(req: NextRequest, { params }: { params: { tenantId: string } }) {
    const requestId = makeRequestId(req);
    const auth = await requireAdmin(req, { requestId });
    if (!auth.ok) return auth.response;

    // Enforce tenant isolation
    if (auth.session.tenantId !== params.tenantId) {
        return NextResponse.json({ error: 'Tenant mismatch' }, { status: 403 });
    }

    // Rate Limiter
    const rlDecision = await rateLimiter.limit('secrets.get', auth.session.tenantId, {
        max: 100,
        windowSec: 60,
    });

    if (!rlDecision.allowed) {
        const res = NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        return applyRateLimitHeaders(res, rlDecision);
    }

    try {
        const metadataList = await tenantSecretsRepository.getMetadataByTenant(params.tenantId);

        const res = NextResponse.json({ secrets: metadataList });
        return applyRateLimitHeaders(res, rlDecision);
    } catch (error: any) {
        console.error('Failed to get secrets metadata:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
