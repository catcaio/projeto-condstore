export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { executeAction } from '@/lib/actions/action-engine';
import { SupremeForbiddenError } from '@/lib/governance/supreme-permissions';

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
        const executedBy = auth.session?.sub ?? 'admin';
        const result = await executeAction(tenantId, actionId, executedBy);
        return NextResponse.json({ ok: true, data: result });
    } catch (err: any) {
        if (err instanceof SupremeForbiddenError) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 403, requestId, err.message);
        }
        const status = err.message?.includes('not found') ? 404
            : err.message?.includes('Cannot execute') ? 409
                : 500;
        const code = status === 500 ? ErrorCode.UNKNOWN : ErrorCode.VALIDATION_ERROR;
        return errorResponse(code, status, requestId, err.message ?? 'Execution failed');
    }
};
