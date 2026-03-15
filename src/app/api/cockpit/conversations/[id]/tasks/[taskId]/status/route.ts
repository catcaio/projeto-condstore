import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { getDb } from '@/infra/db';
import { crmTasks } from '@/drizzle/schema';
import { and, eq } from 'drizzle-orm';

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string, taskId: string }> }
) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    
    const { tenantId } = auth.session as any;

    try {
        const { taskId } = await context.params;
        const body = await request.json().catch(() => ({}));
        const { status } = body;

        if (!status || !['OPEN', 'DONE', 'CANCELED'].includes(status)) {
            return errorResponse('VALIDATION_ERROR' as any, 400, requestId, 'Invalid status: must be OPEN, DONE or CANCELED');
        }

        const db = await getDb();
        const [task] = await db.select().from(crmTasks).where(and(eq(crmTasks.tenantId, tenantId), eq(crmTasks.id, taskId)));

        if (!task) {
            return errorResponse('NOT_FOUND' as any, 404, requestId, 'Task not found');
        }

        await db.update(crmTasks)
            .set({ status })
            .where(and(eq(crmTasks.tenantId, tenantId), eq(crmTasks.id, taskId)));

        return NextResponse.json({ ok: true, data: { ...task, status } });
    } catch (err: any) {
        logger.error('Failed to update crm task status', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
