import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/modules/atendimento/conversation.service';
import { requireAdmin } from '@/infra/auth/guards';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { twilioProvider } from '@/providers/twilio.provider';
import { logger } from '@/infra/logger';
import { decryptString } from '@/infra/pii/crypto';

function extractInboundMessageSid(metadata: Record<string, unknown> | null | undefined): string | null {
    if (!metadata) return null;

    const candidate = metadata.MessageSid ?? metadata.messageSid ?? metadata.twilioMessageSid;
    return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate.trim() : null;
}

async function resolveRecipientPhone(
    tenantId: string,
    conversationId: string,
    phoneEncrypted: string,
    requestId: string
) {
    try {
        return decryptString(phoneEncrypted);
    } catch (decryptError) {
        logger.warn('conversation_outbound_phone_fallback_lookup', {
            requestId,
            tenantId,
            conversationId,
            error: decryptError instanceof Error ? decryptError.message : String(decryptError),
        });

        const messages = await conversationService.getConversationMessages(tenantId, conversationId);
        const latestInbound = [...messages].reverse().find((message) => message.direction === 'INBOUND');
        const messageSid = extractInboundMessageSid((latestInbound?.metadata as Record<string, unknown> | null | undefined));

        if (!messageSid) {
            throw new Error('Unable to resolve recipient phone: inbound MessageSid not found');
        }

        const lookup = await twilioProvider.fetchMessageBySid(tenantId, messageSid);
        if (!lookup.ok || !lookup.from) {
            throw new Error(lookup.ok ? 'Unable to resolve recipient phone from Twilio lookup' : lookup.message);
        }

        return lookup.from;
    }
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const requestId = makeRequestId(request);
    
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    const tenantId = auth.session.tenantId;
    const operatorId = (auth.session as any).userId ?? auth.session.sub;
    let persistedMessageId: string | null = null;
    let activeConversationId: string | null = null;

    try {
        const { id: conversationId } = await context.params;
        activeConversationId = conversationId;
        const body = await request.json().catch(() => ({}));
        const payloadText = typeof body?.text === 'string' ? body.text : body?.message;

        if (!payloadText || typeof payloadText !== 'string' || payloadText.trim() === '') {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Text is required and cannot be empty');
        }

        const text = payloadText.trim();

        const conversation = await conversationService.getConversationById(tenantId, conversationId);
        if (!conversation) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Conversation not found');
        }

        const outboundMetadata = {
            status: 'queued_for_send',
            requestId,
            operatorId,
            channel: 'whatsapp',
        };
        const conversationMessage = await conversationService.processOutboundMessage(
            tenantId,
            conversationId,
            text,
            'OPERATOR',
            conversation.customerId || undefined,
            outboundMetadata,
            { advanceConversation: false }
        );
        persistedMessageId = conversationMessage.id;
        const plaintextPhone = await resolveRecipientPhone(
            tenantId,
            conversationId,
            conversation.phoneEncrypted,
            requestId
        );

        logger.info('TWILIO_OUTBOUND_START', {
            requestId,
            tenantId,
            conversationId,
            conversationMessageId: conversationMessage.id,
            operatorId,
        });

        const sendResult = await twilioProvider.sendMessageDetailed(tenantId, {
            to: plaintextPhone,
            body: text
        });

        if (!sendResult.ok) {
            const failedMetadata = {
                ...outboundMetadata,
                status: 'send_error',
                errorCode: sendResult.errorCode,
                errorMessage: sendResult.message,
                providerStatusCode: sendResult.providerStatusCode ?? null,
                failedAt: new Date().toISOString(),
                retryable: sendResult.retryable ?? false,
            };

            await conversationService.updateMessageFields(
                tenantId,
                conversationMessage.id,
                { metadata: failedMetadata, deliveryStatus: 'failed' }
            );

            logger.error('TWILIO_OUTBOUND_ERROR', new Error(sendResult.message), {
                requestId,
                tenantId,
                conversationId,
                conversationMessageId: conversationMessage.id,
                operatorId,
                errorCode: sendResult.errorCode,
                providerStatusCode: sendResult.providerStatusCode ?? null,
                retryable: sendResult.retryable ?? false,
            });

            return errorResponse(
                ErrorCode.UPSTREAM_TWILIO_ERROR,
                502,
                requestId,
                'Failed to send message via Twilio',
                {
                    conversationMessageId: conversationMessage.id,
                    twilioErrorCode: sendResult.errorCode,
                    providerStatusCode: sendResult.providerStatusCode ?? null,
                }
            );
        }

        const deliveredMetadata = {
            ...outboundMetadata,
            status: 'sent_ok',
            twilioSid: sendResult.sid,
            twilioStatus: sendResult.status,
            providerStatusCode: sendResult.providerStatusCode,
            attempts: sendResult.attempts,
            sentAt: new Date().toISOString(),
        };

        const updatedMessage = await conversationService.updateMessageFields(
            tenantId,
            conversationMessage.id,
            {
                metadata: deliveredMetadata,
                providerMessageId: sendResult.sid,
                deliveryStatus: sendResult.status
            }
        );

        if (conversation.status !== 'HUMAN_ACTIVE') {
            await conversationService.markConversationWaitingCustomer(tenantId, conversationId);
        }

        if (conversation.stage === 'NEW_LEAD') {
            await conversationService.changeConversationStage(tenantId, conversationId, 'IN_ATTENDANCE', conversation.customerId ?? undefined);
            
            const { publishOperationalEvent } = await import('@/lib/events/operational-event-bus');
            await publishOperationalEvent({
                tenantId,
                eventType: 'first_reply_sent',
                eventDomain: 'OPERATIONS',
                customerId: conversation.customerId ?? null,
                sessionId: conversation.phoneHash,
                payload: {
                    conversationId,
                    operatorId,
                    stage: 'IN_ATTENDANCE'
                }
            });
        }

        logger.info('TWILIO_OUTBOUND_SUCCESS', {
            requestId,
            tenantId,
            conversationId,
            messageId: conversationMessage.id,
        });

        return NextResponse.json({
            ok: true,
            data: updatedMessage ?? conversationMessage,
            twilio: {
                sid: sendResult.sid,
                status: sendResult.status,
            },
        });
    } catch (err: any) {
        if (persistedMessageId) {
            await conversationService.updateMessageFields(tenantId, persistedMessageId, {
                metadata: {
                    status: 'send_error',
                    requestId,
                    operatorId,
                    failedAt: new Date().toISOString(),
                    errorMessage: err instanceof Error ? err.message : String(err),
                },
                deliveryStatus: 'failed'
            }).catch(() => undefined);
        }
        logger.error('Failed to send operator message', err as Error, {
            requestId,
            tenantId,
            operatorId,
            conversationId: activeConversationId,
            conversationMessageId: persistedMessageId,
        });
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, err.message);
    }
}
