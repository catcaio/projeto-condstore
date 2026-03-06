export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { rejectAction } from '@/lib/actions/action-engine';

export const POST = async (
    request: NextRequest,
    { params }: { params: Promise<{ tenantId: string; actionId: string }> }
) => {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const { tenantId, actionId } = await params;
    if (!tenantId?.trim() || !actionId?.trim()) {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'tenantId and actionId required');
    }

    try {
        const rejectedBy = auth.session?.sub ?? 'admin';
        const result = await rejectAction(tenantId, actionId, rejectedBy);
        return NextResponse.json({ ok: true, data: result });
    } catch (err: any) {
        const status = err.message?.includes('not found') ? 404 : 409;
        return errorResponse(err.message?.includes('not found') ? ErrorCode.UNKNOWN : ErrorCode.VALIDATION_ERROR, status, requestId, err.message);
    }
};
