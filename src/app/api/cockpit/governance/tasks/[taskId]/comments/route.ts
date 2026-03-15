import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { commentTask } from '@/modules/governance/services/governance.service';
import { listTaskComments } from '@/modules/governance/repositories/governance.repository';

export async function GET(request: NextRequest, context: { params: Promise<{ taskId: string }> }) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    try {
        const { taskId } = await context.params;
        const comments = await listTaskComments(auth.session.tenantId, taskId);
        return NextResponse.json({ ok: true, data: comments });
    } catch (err: any) {
        logger.error('governance_list_task_comments_error', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}

export async function POST(request: NextRequest, context: { params: Promise<{ taskId: string }> }) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    try {
        const { taskId } = await context.params;
        const body = await request.json();
        const ctx = {
            tenantId: auth.session.tenantId,
            actorUserId: auth.session.sub,
            role: auth.session.role,
        };
        const comment = await commentTask(ctx, taskId, body.body);
        return NextResponse.json({ ok: true, data: comment });
    } catch (err: any) {
        logger.error('governance_create_task_comment_error', err as Error, { requestId });
        return errorResponse('BAD_REQUEST' as any, 400, requestId, err.message);
    }
}
