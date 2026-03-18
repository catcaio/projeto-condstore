import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { attachRequestIdHeader, makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { frankService } from '@/modules/frank/server';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const { id: conversationId } = await params;
    const tenantId = auth.session.tenantId;

    try {
        const payload = await request.json().catch(() => ({}));
        payload.operatorId = (auth.session as any).sub || 'system';

        if (!conversationId) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Conversation ID is required');
        }

        const approved = await frankService.approveOperationalDraft(tenantId, conversationId, payload);

        const res = NextResponse.json({ ok: true, data: approved }, { status: 200 });
        attachRequestIdHeader(res, requestId);
        return res;
    } catch (error: any) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Failed to approve operational draft', error);
    }
}
