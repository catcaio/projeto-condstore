import { NextRequest, NextResponse } from 'next/server';
import { freightQuoteService } from '@/modules/atendimento/freight-quote.service';
import { simulations } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import { conversationService } from '@/modules/atendimento/conversation.service';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { twilioProvider } from '@/providers/twilio.provider';
import { decryptString } from '@/infra/pii/crypto';
import { domineIntakeService } from '@/domine/domine-intake.service';
import { logger } from '@/infra/logger';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string, quoteId: string }> }
) {
    const requestId = makeRequestId(request);
    
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    const { tenantId, userId: operatorId } = auth.session as any; 

    try {
        const { id: conversationId, quoteId } = await context.params;
        
        // Fetch Conversation
        const conversation = await conversationService.getConversationById(tenantId, conversationId);
        if (!conversation) {
            return errorResponse('NOT_FOUND' as any, 404, requestId, 'Conversation not found');
        }

        // Fetch Quote
        const quote = await freightQuoteService.getQuoteById(tenantId, quoteId);
        if (!quote) {
            return errorResponse('NOT_FOUND' as any, 404, requestId, 'Quote not found');
        }

        if (quote.conversationId !== conversationId) {
            return errorResponse('VALIDATION_ERROR' as any, 400, requestId, 'Quote does not belong to this conversation');
        }

        if (['CONVERTED', 'EXPIRED'].includes(quote.status)) {
            return errorResponse('VALIDATION_ERROR' as any, 400, requestId, `Cannot send quote in ${quote.status} status`);
        }

        const plaintextPhone = decryptString(conversation.phoneEncrypted);
        
        // Format the message
        let carrierName = quote.bestCarrier || 'Transportadora Parceira';
        const formattedPrice = Number(quote.bestPrice).toFixed(2).replace('.', ',');
        const deadline = quote.bestService || 'Consultar'; // usually bestService holds the SLA info or we can use generic text
        
        const message = `🚚 *Cotação de Frete*\nEncontramos a melhor opção para você via ${carrierName}:\n\nValor: R$ ${formattedPrice}\nEstimativa (dias): ${deadline}\n\nPara seguirmos com o envio, basta confirmar!`;

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
            conversation.customerId || undefined, 
            {
                status: 'quote_sent',
                quoteId: quote.id,
                actorType: 'HUMAN',
                messageType: 'TEXT'
            }
        );
        if (conversation.stage === 'NEW_LEAD' || conversation.stage === 'IN_ATTENDANCE') {
            await conversationService.changeConversationStage(tenantId, conversationId, 'QUOTED', conversation.customerId ?? undefined);
        }

        await freightQuoteService.sendQuote(tenantId, quoteId);

        // 3. Emit QUOTE_SENT
        void domineIntakeService.publish({
            tenantId,
            type: 'QUOTE_SENT',
            source: 'cockpit',
            payload: {
                quoteId: quote.id,
                conversationId,
                operatorId,
                customerId: conversation.customerId
            }
        }).catch(e => logger.warn('Failed to emit QUOTE_SENT', { error: e.message }));

        return NextResponse.json({ ok: true, data: conversationMessage });
    } catch (err: any) {
        logger.error('Failed to send freight quote to customer', err as Error, { requestId });
        const message = err?.message ?? 'Failed to send freight quote to customer';
        const isValidationError =
            message.includes('Quote does not belong to this conversation') ||
            message.includes('Cannot send quote in');

        return errorResponse(
            isValidationError ? 'VALIDATION_ERROR' as any : 'INTERNAL_ERROR' as any,
            isValidationError ? 400 : 500,
            requestId,
            message
        );
    }
}
