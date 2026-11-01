import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/modules/conversations/server';
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
    const operatorId = (auth.session as any).userId ?? auth.session.sub;

    try {
        const { id: conversationId } = await context.params;

        const conversation = await conversationService.getConversationById(tenantId, conversationId);
        if (!conversation) {
            return errorResponse('NOT_FOUND' as any, 404, requestId, 'Conversation not found');
        }

        // Atomically release the conversation: unassign operator, set status to triaged, record handback
        await conversationService.releaseConversation(
            tenantId,
            conversationId,
            conversation.customerId ?? undefined,
            operatorId
        );
        
        logger.info('cockpit_conversation_released', {
            requestId,
            tenantId,
            conversationId,
            operatorId,
        });

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        // Safe logging without PII or customer payloads
        logger.error('Failed to release conversation', err as Error, {
            requestId,
            tenantId,
        });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, 'Failed to release conversation');
    }
}
