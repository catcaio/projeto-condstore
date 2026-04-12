import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/modules/atendimento/conversation.service';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const requestId = makeRequestId(request);

    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    const tenantId = auth.session.tenantId;

    try {
        const { id: conversationId } = await context.params;

        const conversation = await conversationService.getConversationById(tenantId, conversationId);
        if (!conversation) {
            return errorResponse('NOT_FOUND' as any, 404, requestId, 'Conversation not found');
        }

        const releasedStatus = conversation.status === 'operator_active'
            ? 'awaiting_human'
            : conversation.status;

        // Release the conversation, unassign operator, and return it to a valid queue status.
        await conversationService.unassignConversation(tenantId, conversationId, conversation.customerId ?? undefined);
        await conversationService.updateConversationStatus(tenantId, conversationId, releasedStatus, conversation.customerId ?? undefined);
        
        logger.info('cockpit_conversation_released', {
            requestId,
            tenantId,
            conversationId,
        });

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        logger.error('Failed to release conversation', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
