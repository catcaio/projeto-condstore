import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/modules/atendimento/conversation.service';
import { requireAdmin } from '@/infra/auth/guards';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { twilioProvider } from '@/providers/twilio.provider';
import { logger } from '@/infra/logger';
import { decryptString } from '@/infra/pii/crypto';
import { whatsappOutboundService } from '@/modules/atendimento/whatsapp-outbound.service';

function extractInboundMessageSid(metadata: Record<string, unknown> | null | undefined): string | null {
    if (!metadata) return null;

    const candidate = metadata.MessageSid ?? metadata.messageSid ?? metadata.twilioMessageSid;
    return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate.trim() : null;
}

async function resolveRecipientPhone(
    tenantId: string,
    conversationId: string,
    phoneEncrypted: string,
    requestId: string,
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
        const latestInbound = [...messages].reverse().find((message) => message.direction === 'inbound');
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
    context: { params: Promise<{ id: string }> },
) {
    const requestId = makeRequestId(request);

    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const tenantId = auth.session.tenantId;
    const operatorId = (auth.session as any).userId ?? auth.session.sub;
    let activeConversationId: string | null = null;

    try {
        const { id: conversationId } = await context.params;
        activeConversationId = conversationId;
        let body;
        try {
            body = await request.json();
        } catch {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid JSON body');
        }

        const payloadText = typeof body?.text === 'string' ? body.text : body?.message;
        if (!payloadText || typeof payloadText !== 'string' || payloadText.trim() === '') {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Text is required and cannot be empty');
        }

        const text = payloadText.trim();
        const conversation = await conversationService.getConversationById(tenantId, conversationId);
        if (!conversation) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Conversation not found');
        }

        const plaintextPhone = await resolveRecipientPhone(
            tenantId,
            conversationId,
            conversation.phoneEncrypted,
            requestId,
        );

        const outboundMetadata = {
            status: 'queued_for_send',
            requestId,
            operatorId,
            channel: 'whatsapp',
        };

        logger.info('TWILIO_OUTBOUND_START', {
            requestId,
            tenantId,
            conversationId,
            operatorId,
        });

        const trackedSend = await whatsappOutboundService.sendTrackedMessage({
            tenantId,
            conversationId,
            to: plaintextPhone,
            message: text,
            source: 'OPERATOR',
            actorType: 'HUMAN',
            customerId: conversation.customerId || undefined,
            metadata: outboundMetadata,
        });
        const conversationMessage = trackedSend.conversationMessage;

        if (!trackedSend.ok) {
            logger.error('TWILIO_OUTBOUND_ERROR', new Error(trackedSend.sendResult.message), {
                requestId,
                tenantId,
                conversationId,
                conversationMessageId: conversationMessage.id,
                operatorId,
                errorCode: trackedSend.sendResult.errorCode,
                providerStatusCode: trackedSend.sendResult.providerStatusCode ?? null,
                retryable: trackedSend.sendResult.retryable ?? false,
            });

            return errorResponse(
                ErrorCode.UPSTREAM_TWILIO_ERROR,
                502,
                requestId,
                'Failed to send message via Twilio',
                {
                    conversationMessageId: conversationMessage.id,
                    twilioErrorCode: trackedSend.sendResult.errorCode,
                    providerStatusCode: trackedSend.sendResult.providerStatusCode ?? null,
                },
            );
        }

        if (conversation.status !== 'operator_active') {
            await conversationService.updateConversationStatus(tenantId, conversationId, 'operator_active');
        }

        if (conversation.stage === 'NEW_LEAD') {
            await conversationService.changeConversationStage(
                tenantId,
                conversationId,
                'IN_ATTENDANCE',
                conversation.customerId ?? undefined,
            );

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
                    stage: 'IN_ATTENDANCE',
                },
            });
        }

        logger.info('TWILIO_OUTBOUND_SUCCESS', {
            requestId,
            tenantId,
            conversationId,
            messageId: conversationMessage.id,
            twilioSid: trackedSend.sendResult.sid,
            deliveryStatus: trackedSend.normalizedStatus,
        });

        return NextResponse.json({
            ok: true,
            data: trackedSend.updatedMessage ?? conversationMessage,
            twilio: {
                sid: trackedSend.sendResult.sid,
                status: trackedSend.normalizedStatus,
                providerStatus: trackedSend.sendResult.status,
            },
        });
    } catch (err: any) {
        logger.error('Failed to send operator message', err as Error, {
            requestId,
            tenantId,
            operatorId,
            conversationId: activeConversationId,
        });
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, err.message);
    }
}
