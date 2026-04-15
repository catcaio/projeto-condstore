import type { ConversationMessageRecord, MessageDeliveryStatusType } from '@/drizzle/schema';
import {
    twilioProvider,
    type TwilioSendFailure,
    type TwilioSendSuccess,
} from '@/providers/twilio.provider';
import { conversationService } from './conversation.service';
import {
    mergeMessageDeliveryTrackingMetadata,
    resolveInitialOutboundDeliveryStatus,
} from './whatsapp-delivery-status.service';

interface TrackedSendFailure extends Omit<TwilioSendFailure, 'errorCode'> {
    errorCode:
        | TwilioSendFailure['errorCode']
        | 'MISSING_MESSAGE_SID';
}

export interface SendTrackedWhatsAppMessageParams {
    tenantId: string;
    conversationId: string;
    to: string;
    message: string;
    source: 'OPERATOR' | 'SYSTEM';
    actorType: 'HUMAN' | 'AI' | 'SYSTEM';
    customerId?: string;
    metadata?: Record<string, unknown>;
}

export type SendTrackedWhatsAppMessageResult =
    | {
        ok: true;
        conversationMessage: ConversationMessageRecord;
        updatedMessage: ConversationMessageRecord | undefined;
        sendResult: TwilioSendSuccess;
        normalizedStatus: MessageDeliveryStatusType;
    }
    | {
        ok: false;
        conversationMessage: ConversationMessageRecord;
        sendResult: TrackedSendFailure;
    };

function normalizeOptionalString(value: string | null | undefined): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

export const whatsappOutboundService = {
    async sendTrackedMessage(params: SendTrackedWhatsAppMessageParams): Promise<SendTrackedWhatsAppMessageResult> {
        const queuedMetadata = {
            ...params.metadata,
            channel: 'whatsapp',
            actorType: params.actorType,
            messageType: params.metadata?.messageType ?? 'TEXT',
            status: params.metadata?.status ?? 'queued_for_send',
            queuedAt: new Date().toISOString(),
        };

        const conversationMessage = await conversationService.processOutboundMessage(
            params.tenantId,
            params.conversationId,
            params.message,
            params.source,
            params.customerId,
            queuedMetadata,
            { advanceConversation: false },
        );

        try {
            const sendResult = await twilioProvider.sendMessageDetailed(params.tenantId, {
                to: params.to,
                body: params.message,
            });

            if (!sendResult.ok) {
                const failedMetadata = {
                    ...queuedMetadata,
                    status: 'send_error',
                    errorCode: sendResult.errorCode,
                    errorMessage: sendResult.message,
                    providerStatusCode: sendResult.providerStatusCode ?? null,
                    failedAt: new Date().toISOString(),
                    retryable: sendResult.retryable ?? false,
                };

                await conversationService.updateMessageFields(params.tenantId, conversationMessage.id, {
                    metadata: failedMetadata,
                    deliveryStatus: 'failed',
                });

                return {
                    ok: false,
                    conversationMessage,
                    sendResult,
                };
            }

            const sid = normalizeOptionalString(sendResult.sid);
            if (!sid) {
                const failedMetadata = {
                    ...queuedMetadata,
                    status: 'send_error',
                    errorCode: 'MISSING_MESSAGE_SID',
                    errorMessage: 'Twilio send succeeded without a MessageSid',
                    providerStatusCode: sendResult.providerStatusCode ?? null,
                    failedAt: new Date().toISOString(),
                    retryable: false,
                };

                await conversationService.updateMessageFields(params.tenantId, conversationMessage.id, {
                    metadata: failedMetadata,
                    deliveryStatus: 'failed',
                });

                return {
                    ok: false,
                    conversationMessage,
                    sendResult: {
                        ok: false,
                        errorCode: 'MISSING_MESSAGE_SID',
                        message: 'Twilio send succeeded without a MessageSid',
                        to: sendResult.to,
                        attempts: sendResult.attempts,
                        providerStatusCode: sendResult.providerStatusCode,
                        retryable: false,
                    },
                };
            }

            const normalizedStatus = resolveInitialOutboundDeliveryStatus(sendResult.status);
            const sentAt = new Date();
            const sentMetadata = {
                ...mergeMessageDeliveryTrackingMetadata(
                    (conversationMessage.metadata as Record<string, unknown> | null | undefined) ?? queuedMetadata,
                    {
                        sid,
                        providerStatus: sendResult.status,
                        normalizedStatus,
                        statusUpdatedAt: sentAt,
                    },
                ),
                status: 'sent_ok',
                providerStatusCode: sendResult.providerStatusCode,
                attempts: sendResult.attempts,
                sentAt: sentAt.toISOString(),
            };

            const updatedMessage = await conversationService.updateMessageFields(params.tenantId, conversationMessage.id, {
                metadata: sentMetadata,
                providerMessageId: sid,
                deliveryStatus: normalizedStatus,
            });

            return {
                ok: true,
                conversationMessage,
                updatedMessage,
                sendResult: {
                    ...sendResult,
                    sid,
                },
                normalizedStatus,
            };
        } catch (error) {
            const failedMetadata = {
                ...queuedMetadata,
                status: 'send_error',
                errorCode: 'UNKNOWN_ERROR',
                errorMessage: error instanceof Error ? error.message : String(error),
                failedAt: new Date().toISOString(),
                retryable: false,
            };

            await conversationService.updateMessageFields(params.tenantId, conversationMessage.id, {
                metadata: failedMetadata,
                deliveryStatus: 'failed',
            }).catch(() => undefined);

            throw error;
        }
    },
};
