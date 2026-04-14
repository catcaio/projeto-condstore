import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { attachRequestIdHeader, makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import {
    listKnowledge,
    searchKnowledgeForQuery,
    createKnowledgeEntry,
} from '@/modules/frank/knowledge/knowledge.service';
import { applyFrankCockpitRateLimit } from '@/infra/security/frank-rate-limit';

export async function GET(request: NextRequest): Promise<NextResponse> {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const tenantId = auth.session.tenantId;
    const q = request.nextUrl.searchParams.get('q')?.trim();

    const rl = await applyFrankCockpitRateLimit({ tenantId, requestId, route: '/api/cockpit/frank/knowledge' });
    if (rl.blocked) return rl.response;

    try {
        const data = q
            ? await searchKnowledgeForQuery(tenantId, q)
            : { entries: await listKnowledge(tenantId), query: '' };

        const res = NextResponse.json({ ok: true, data: data.entries }, { status: 200 });
        attachRequestIdHeader(res, requestId);
        return res;
    } catch {
        return errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Failed to load knowledge entries');
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const tenantId = auth.session.tenantId;

    const rl = await applyFrankCockpitRateLimit({ tenantId, requestId, route: '/api/cockpit/frank/knowledge' });
    if (rl.blocked) return rl.response;

    try {
        const body = await request.json();
        const { title, content, tags, source } = body;

        if (!title || !content) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'title and content are required');
        }

        const id = await createKnowledgeEntry({
            tenantId,
            title,
            content,
            tags: tags ?? [],
            source: source ?? 'manual',
        });

        const res = NextResponse.json({ ok: true, id }, { status: 201 });
        attachRequestIdHeader(res, requestId);
        return res;
    } catch {
        return errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Failed to create knowledge entry');
    }
}
