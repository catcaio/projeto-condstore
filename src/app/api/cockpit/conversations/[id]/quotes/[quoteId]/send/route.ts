import { NextRequest, NextResponse } from 'next/server';
import { freightQuoteService } from '@/modules/atendimento/freight-quote.service';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { conversationService } from '@/modules/atendimento/conversation.service';
import { decryptString } from '@/infra/pii/crypto';
import { domineIntakeService } from '@/domine/domine-intake.service';
import { logger } from '@/infra/logger';
import { whatsappOutboundService } from '@/modules/atendimento/whatsapp-outbound.service';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string, quoteId: string }> },
) {
    const requestId = makeRequestId(request);

    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    const { tenantId, userId: operatorId } = auth.session as any;

    try {
        const { id: conversationId, quoteId } = await context.params;

        const conversation = await conversationService.getConversationById(tenantId, conversationId);
        if (!conversation) {
            return errorResponse('NOT_FOUND' as any, 404, requestId, 'Conversation not found');
        }

        const quote = await freightQuoteService.getQuoteById(tenantId, quoteId);
        if (!quote) {
            return errorResponse('NOT_FOUND' as any, 404, requestId, 'Quote not found');
        }

        if (quote.conversationId !== conversationId) {
            return errorResponse('VALIDATION_ERROR' as any, 400, requestId, 'Quote does not belong to this conversation');
        }

        const plaintextPhone = decryptString(conversation.phoneEncrypted);
        const carrierName = quote.bestCarrier || 'Transportadora Parceira';
        const formattedPrice = Number(quote.bestPrice).toFixed(2).replace('.', ',');
        const deadline = quote.bestService || 'Consultar';
        const message = `🚚 *Cotação de Frete*\nEncontramos a melhor opção para você via ${carrierName}:\n\nValor: R$ ${formattedPrice}\nEstimativa (dias): ${deadline}\n\nPara seguirmos com o envio, basta confirmar!`;

        const trackedSend = await whatsappOutboundService.sendTrackedMessage({
            tenantId,
            conversationId,
            to: plaintextPhone,
            message,
            source: 'OPERATOR',
            actorType: 'HUMAN',
            customerId: conversation.customerId || undefined,
            metadata: {
                status: 'quote_sent',
                quoteId: quote.id,
                actorType: 'HUMAN',
                messageType: 'TEXT',
                requestId,
                operatorId,
            },
        });

        if (!trackedSend.ok) {
            logger.error('QUOTE_SEND_TWILIO_ERROR', new Error(trackedSend.sendResult.message), {
                requestId,
                tenantId,
                conversationId,
                quoteId,
                conversationMessageId: trackedSend.conversationMessage.id,
                errorCode: trackedSend.sendResult.errorCode,
                providerStatusCode: trackedSend.sendResult.providerStatusCode ?? null,
            });

            return errorResponse('TWILIO_API_ERROR' as any, 502, requestId, 'Failed to send message via Twilio', {
                conversationMessageId: trackedSend.conversationMessage.id,
                twilioErrorCode: trackedSend.sendResult.errorCode,
                providerStatusCode: trackedSend.sendResult.providerStatusCode ?? null,
            });
        }

        await conversationService.markConversationWaitingCustomer(tenantId, conversationId);

        if (conversation.stage === 'NEW_LEAD' || conversation.stage === 'IN_ATTENDANCE') {
            await conversationService.changeConversationStage(
                tenantId,
                conversationId,
                'QUOTED',
                conversation.customerId ?? undefined,
            );
        }

        await freightQuoteService.sendQuote(tenantId, quoteId);

        void domineIntakeService.publish({
            tenantId,
            type: 'QUOTE_SENT',
            source: 'cockpit',
            payload: {
                quoteId: quote.id,
                conversationId,
                operatorId,
                customerId: conversation.customerId,
                messageId: trackedSend.conversationMessage.id,
                sid: trackedSend.sendResult.sid,
                deliveryStatus: trackedSend.normalizedStatus,
            },
        }).catch((error) => logger.warn('Failed to emit QUOTE_SENT', { error: error.message }));

        return NextResponse.json({
            ok: true,
            data: trackedSend.updatedMessage ?? trackedSend.conversationMessage,
            twilio: {
                sid: trackedSend.sendResult.sid,
                status: trackedSend.normalizedStatus,
                providerStatus: trackedSend.sendResult.status,
            },
        });
    } catch (err: any) {
        logger.error('Failed to send freight quote to customer', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
