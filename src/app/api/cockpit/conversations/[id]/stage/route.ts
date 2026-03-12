import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/modules/atendimento/conversation.service';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    
    const { tenantId } = auth.session as any;

    try {
        const { id: conversationId } = await context.params;
        const body = await request.json().catch(() => ({}));
        const { stage } = body;

        if (!stage || !['NEW', 'QUALIFYING', 'QUOTED', 'NEGOTIATING', 'WON', 'LOST'].includes(stage)) {
            return errorResponse('VALIDATION_ERROR' as any, 400, requestId, 'Invalid or missing stage');
        }

        const conversation = await conversationService.getConversationById(tenantId, conversationId);
        if (!conversation) {
            return errorResponse('NOT_FOUND' as any, 404, requestId, 'Conversation not found');
        }

        await conversationService.changeConversationStage(
            tenantId,
            conversationId,
            stage as any,
            conversation.customerId || undefined
        );

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        logger.error('Failed to change conversation stage', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
