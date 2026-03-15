import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { getTaskDetail, updateTask } from '@/modules/governance/services/governance.service';

export async function GET(request: NextRequest, context: { params: Promise<{ taskId: string }> }) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    try {
        const { taskId } = await context.params;
        const ctx = {
            tenantId: auth.session.tenantId,
            actorUserId: auth.session.sub,
            role: auth.session.role,
        };
        const task = await getTaskDetail(ctx, taskId);
        if (!task) return errorResponse('NOT_FOUND' as any, 404, requestId, 'Task not found');
        return NextResponse.json({ ok: true, data: task });
    } catch (err: any) {
        logger.error('governance_get_task_error', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ taskId: string }> }) {
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
        await updateTask(ctx, taskId, body);
        return NextResponse.json({ ok: true });
    } catch (err: any) {
        logger.error('governance_update_task_error', err as Error, { requestId });
        return errorResponse('BAD_REQUEST' as any, 400, requestId, err.message);
    }
}
