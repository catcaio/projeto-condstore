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
        const { message } = body;

        if (!message || typeof message !== 'string' || message.trim() === '') {
            return errorResponse('VALIDATION_ERROR' as any, 400, requestId, 'Message is required and cannot be empty');
        }

        const conversation = await conversationService.getConversationById(tenantId, conversationId);
        if (!conversation) {
            return errorResponse('NOT_FOUND' as any, 404, requestId, 'Conversation not found');
        }

        const plaintextPhone = decryptString(conversation.phoneEncrypted);
        
        // 1. Send via Twilio
        const sent = await twilioProvider.sendMessage(tenantId, {
            to: plaintextPhone,
            body: message
        });

        if (!sent) {
            return errorResponse('TWILIO_API_ERROR' as any, 502, requestId, 'Failed to send message via Twilio');
        }

        // 2. Persist to DB directly through service
        const conversationMessage = await conversationService.processOutboundMessage(
            tenantId,
            conversationId,
            message,
            'OPERATOR',
            conversation.customerId || undefined, // Emit timeline event to customer
            {
                status: 'sent_ok'
            }
        );

        return NextResponse.json({ ok: true, data: conversationMessage });
    } catch (err: any) {
        logger.error('Failed to send operator message', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
