import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { attachRequestIdHeader, makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { suggestionService } from '@/modules/frank/suggestions/suggestion.service';
import { ApproveSuggestionDTOSchema } from '@/modules/frank/suggestions/suggestion.types';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const tenantId = auth.session.tenantId;

    try {
        const payload = await request.json().catch(() => ({}));
        payload.operatorId = (auth.session as any).sub || 'system';

        const parsed = ApproveSuggestionDTOSchema.safeParse(payload);
        if (!parsed.success) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid payload', parsed.error);
        }

        const approved = await suggestionService.approveSuggestion(tenantId, id, parsed.data);

        if (!approved) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Suggestion not found or already processed');
        }

        const res = NextResponse.json({ ok: true }, { status: 200 });
        attachRequestIdHeader(res, requestId);
        return res;
    } catch {
        return errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Failed to approve suggestion');
    }
}
