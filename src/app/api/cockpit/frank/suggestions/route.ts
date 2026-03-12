import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { attachRequestIdHeader, makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { listPendingSuggestions } from '@/modules/frank/suggestions/suggestion.service';

export async function GET(request: NextRequest): Promise<NextResponse> {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const tenantId = auth.session.tenantId;
    const sessionId = request.nextUrl.searchParams.get('sessionId')?.trim() || undefined;

    try {
        const suggestions = await listPendingSuggestions(tenantId, sessionId);

        const res = NextResponse.json({ ok: true, data: suggestions }, { status: 200 });
        attachRequestIdHeader(res, requestId);
        return res;
    } catch {
        return errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Failed to load suggestions');
    }
}
