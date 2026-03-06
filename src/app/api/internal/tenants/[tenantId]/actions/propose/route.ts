export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { proposeAction } from '@/lib/actions/action-engine';
import { isValidActionScope } from '@/lib/actions/action-types';

export const POST = async (
    request: NextRequest,
    { params }: { params: Promise<{ tenantId: string }> }
) => {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const { tenantId } = await params;
    if (!tenantId?.trim()) return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'tenantId required');

    let body: any;
    try { body = await request.json(); } catch {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid JSON');
    }

    const { actionType, actionScope, payload = {} } = body;
    if (!actionType?.trim()) return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'actionType required');
    if (!isValidActionScope(actionScope)) return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, `Invalid actionScope: ${actionScope}`);

    try {
        const proposedBy = auth.session?.sub ?? 'admin';
        const result = await proposeAction({ tenantId, actionType, actionScope, proposedBy, payload });
        return NextResponse.json({ ok: true, data: result }, { status: 201 });
    } catch (err: any) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, err.message ?? 'Failed to propose action');
    }
};
