import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/modules/atendimento/conversation.service';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { twilioProvider } from '@/providers/twilio.provider';
import { logger } from '@/infra/logger';
import { decryptString } from '@/infra/pii/crypto';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const requestId = makeRequestId(request);
    
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    const { tenantId, userId: operatorId } = auth.session as any; // session shape depends on the exact guard but standardizing on tenantId/userId

    try {
        const { id: conversationId } = await context.params;
        const body = await request.json().catch(() => ({}));
        const payloadText = typeof body?.text === 'string' ? body.text : body?.message;

        if (!payloadText || typeof payloadText !== 'string' || payloadText.trim() === '') {
            return errorResponse('VALIDATION_ERROR' as any, 400, requestId, 'Text is required and cannot be empty');
        }

        const text = payloadText.trim();

        const conversation = await conversationService.getConversationById(tenantId, conversationId);
        if (!conversation) {
            return errorResponse('NOT_FOUND' as any, 404, requestId, 'Conversation not found');
        }

        const plaintextPhone = decryptString(conversation.phoneEncrypted);

        logger.info('cockpit.conversation.outbound_api_call', {
            requestId,
            tenantId,
            conversationId,
        });

        const sent = await twilioProvider.sendMessage(tenantId, {
            to: plaintextPhone,
            body: text
        });

        if (!sent) {
            return errorResponse('TWILIO_API_ERROR' as any, 502, requestId, 'Failed to send message via Twilio');
        }

        const conversationMessage = await conversationService.processOutboundMessage(
            tenantId,
            conversationId,
            text,
            'OPERATOR',
            conversation.customerId || undefined, // Emit timeline event to customer
            {
                status: 'sent_ok'
            }
        );

        logger.info('cockpit.conversation.outbound_success', {
            requestId,
            tenantId,
            conversationId,
            messageId: conversationMessage.id,
        });

        return NextResponse.json({ ok: true, data: conversationMessage });
    } catch (err: any) {
        logger.error('Failed to send operator message', err as Error, { requestId, tenantId, operatorId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
