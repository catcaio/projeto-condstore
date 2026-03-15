import { NextRequest, NextResponse } from 'next/server';
import { conversationRepository } from '@/modules/atendimento/conversation.repository';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { getDb } from '@/infra/db';
import { customers } from '@/drizzle/schema';
import { and, eq } from 'drizzle-orm';

export async function PATCH(
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
        const { ownerId } = body;

        // null is allowed to unassign, but missing property is bad
        if (ownerId === undefined) {
            return errorResponse('VALIDATION_ERROR' as any, 400, requestId, 'Missing ownerId field');
        }

        const conversation = await conversationRepository.getConversationById(tenantId, conversationId);
        if (!conversation) {
            return errorResponse('NOT_FOUND' as any, 404, requestId, 'Conversation not found');
        }

        if (ownerId === null) {
            await conversationRepository.unassignConversation(tenantId, conversationId);
            if (conversation.customerId) {
                const db = await getDb();
                await db.update(customers)
                    .set({ ownerId: null })
                    .where(and(eq(customers.tenantId, tenantId), eq(customers.id, conversation.customerId)));
            }
        } else {
            // Assign explicitly
            await conversationRepository.assignConversation(tenantId, conversationId, ownerId, user?.id);
            if (conversation.customerId) {
                const db = await getDb();
                await db.update(customers)
                    .set({ ownerId })
                    .where(and(eq(customers.tenantId, tenantId), eq(customers.id, conversation.customerId)));
            }
        }

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        logger.error('Failed to change conversation/customer owner', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
