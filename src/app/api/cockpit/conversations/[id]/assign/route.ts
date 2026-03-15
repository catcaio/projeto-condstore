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
    const operatorId = (auth.session as any).userId ?? auth.session.sub;

    try {
        const { id: conversationId } = await context.params;

        const conversation = await conversationService.getConversationById(tenantId, conversationId);
        if (!conversation) {
            return errorResponse('NOT_FOUND' as any, 404, requestId, 'Conversation not found');
        }

        // Assign to the operator and force HUMAN_ACTIVE
        await conversationService.assignConversation(tenantId, conversationId, operatorId, operatorId, conversation.customerId ?? undefined);
        await conversationService.updateConversationStatus(tenantId, conversationId, 'operator_active', conversation.customerId ?? undefined);

        logger.info('cockpit_conversation_assigned', {
            requestId,
            tenantId,
            conversationId,
            operatorId,
        });

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        logger.error('Failed to assign conversation', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
