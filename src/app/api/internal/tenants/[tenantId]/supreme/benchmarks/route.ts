export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { getTenantBenchmarks } from '@/lib/supreme/benchmark-engine';

export const GET = async (
    request: NextRequest,
    { params }: { params: Promise<{ tenantId: string }> }
) => {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const { tenantId } = await params;
    if (!tenantId?.trim()) return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'tenantId required');

    try {
        const data = await getTenantBenchmarks(tenantId);
        return NextResponse.json({ ok: true, data });
    } catch (err: any) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, err.message ?? 'Failed to get supreme benchmarks');
    }
};
