import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { attachRequestIdHeader, makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { suggestionService } from '@/modules/frank/suggestions/suggestion.service';
import { CreateSuggestionDTOSchema } from '@/modules/frank/suggestions/suggestion.types';

export async function GET(request: NextRequest): Promise<NextResponse> {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const tenantId = auth.session.tenantId;
    const conversationId = request.nextUrl.searchParams.get('conversationId')?.trim() || undefined;

    try {
        const suggestions = await suggestionService.listPendingSuggestions(tenantId, conversationId);

        const res = NextResponse.json({ ok: true, data: suggestions }, { status: 200 });
        attachRequestIdHeader(res, requestId);
        return res;
    } catch {
        return errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Failed to load suggestions');
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const tenantId = auth.session.tenantId;
    const sessionId = request.headers.get('x-session-id') || 'unknown';

    try {
        const payload = await request.json();
        const parsed = CreateSuggestionDTOSchema.safeParse(payload);
        if (!parsed.success) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid payload', parsed.error);
        }

        const id = await suggestionService.generateSuggestion(tenantId, sessionId, parsed.data);

        const res = NextResponse.json({ ok: true, data: { id } }, { status: 201 });
        attachRequestIdHeader(res, requestId);
        return res;
    } catch {
        return errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Failed to generate suggestion');
    }
}
