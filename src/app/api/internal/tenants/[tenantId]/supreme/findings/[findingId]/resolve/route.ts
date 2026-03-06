export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { resolveFinding } from '@/lib/supreme/frank-supremo-analyzer';

export const POST = async (
    request: NextRequest,
    { params }: { params: Promise<{ tenantId: string; findingId: string }> }
) => {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const { tenantId, findingId } = await params;
    if (!tenantId?.trim() || !findingId?.trim()) {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'tenantId and findingId required');
    }

    try {
        const result = await resolveFinding(tenantId, findingId);
        return NextResponse.json({ ok: true, data: result });
    } catch (err: any) {
        const status = err.message?.includes('not found') ? 404 : 409;
        return errorResponse(err.message?.includes('not found') ? ErrorCode.UNKNOWN : ErrorCode.VALIDATION_ERROR, status, requestId, err.message);
    }
};
