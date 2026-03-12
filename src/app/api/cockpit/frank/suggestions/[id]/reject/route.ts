import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { attachRequestIdHeader, makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { suggestionService } from '@/modules/frank/suggestions/suggestion.service';
import { z } from 'zod';

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
        const parsed = z.object({ operatorId: z.string() }).safeParse(payload);

        if (!parsed.success) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid payload', parsed.error);
        }

        const rejected = await suggestionService.rejectSuggestion(tenantId, id, parsed.data.operatorId);

        if (!rejected) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Suggestion not found or already processed');
        }

        const res = NextResponse.json({ ok: true }, { status: 200 });
        attachRequestIdHeader(res, requestId);
        return res;
    } catch {
        return errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Failed to reject suggestion');
    }
}
