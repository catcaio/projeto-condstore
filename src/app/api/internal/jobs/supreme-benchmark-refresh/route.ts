export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { computeBenchmarks } from '@/lib/supreme/benchmark-engine';

export const POST = async (request: NextRequest) => {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    try {
        const savedCount = await computeBenchmarks();
        return NextResponse.json({ ok: true, data: { status: 'computed', newlyComputedMetrics: savedCount } }, { status: 201 });
    } catch (err: any) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, err.message ?? 'Failed to run benchmark compute job');
    }
};
