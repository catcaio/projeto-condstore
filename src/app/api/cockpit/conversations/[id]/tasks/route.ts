import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { getDb } from '@/infra/db';
import { crmTasks } from '@/drizzle/schema';
import { and, eq, desc } from 'drizzle-orm';
import { conversationRepository } from '@/modules/atendimento/conversation.repository';
import crypto from 'crypto';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    
    const { tenantId } = auth.session as any;

    try {
        const { id: conversationId } = await context.params;
        const conversation = await conversationRepository.getConversationById(tenantId, conversationId);
        if (!conversation || !conversation.customerId) {
            return NextResponse.json({ ok: true, data: [] });
        }

        const db = await getDb();
        const tasks = await db.select().from(crmTasks)
            .where(and(eq(crmTasks.tenantId, tenantId), eq(crmTasks.customerId, conversation.customerId)))
            .orderBy(desc(crmTasks.createdAt));

        return NextResponse.json({ ok: true, data: tasks });
    } catch (err: any) {
        logger.error('Failed to get crm tasks', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    
    const { tenantId, user } = auth.session as any;

    try {
        const { id: conversationId } = await context.params;
        const body = await request.json().catch(() => ({}));
        const { title, dueAt, assignedOperatorId } = body;

        if (!title || typeof title !== 'string') {
            return errorResponse('VALIDATION_ERROR' as any, 400, requestId, 'Missing or invalid title');
        }

        const conversation = await conversationRepository.getConversationById(tenantId, conversationId);
        if (!conversation || !conversation.customerId) {
            return errorResponse('VALIDATION_ERROR' as any, 400, requestId, 'Conversation must have a linked customer to create tasks');
        }

        const db = await getDb();
        const id = crypto.randomUUID();
        
        const finalOperatorId = assignedOperatorId || conversation.assignedTo || user?.id || 'system';

        await db.insert(crmTasks).values({
            id,
            tenantId,
            customerId: conversation.customerId,
            conversationId,
            assignedOperatorId: finalOperatorId,
            title,
            dueAt: dueAt ? new Date(dueAt) : null,
            status: 'OPEN'
        });

        const [newTask] = await db.select().from(crmTasks).where(eq(crmTasks.id, id));

        return NextResponse.json({ ok: true, data: newTask });
    } catch (err: any) {
        logger.error('Failed to create crm task', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
