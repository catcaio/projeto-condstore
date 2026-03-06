export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { proposeRecommendedAction } from '@/lib/supreme/frank-supremo-analyzer';

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
        const proposedBy = auth.session?.sub ?? 'admin';
        const result = await proposeRecommendedAction(tenantId, findingId, proposedBy);
        return NextResponse.json({ ok: true, data: result }, { status: 201 });
    } catch (err: any) {
        const isNotFound = err.message?.includes('not found');
        const isValidation = err.message?.includes('Cannot propose') || err.message?.includes('No recommended action') || err.message?.includes('Unknown scope');

        const statusCode = isNotFound ? 404 : (isValidation ? 400 : 500);
        const errCode = isValidation ? ErrorCode.VALIDATION_ERROR : ErrorCode.UNKNOWN;

        return errorResponse(errCode, statusCode, requestId, err.message ?? 'Failed to propose action from finding');
    }
};
