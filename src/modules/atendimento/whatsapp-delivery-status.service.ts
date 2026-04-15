import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import {
    conversationMessages,
    conversations,
    operationalEvents,
    type ConversationMessageRecord,
    type MessageDeliveryStatusType,
} from '@/drizzle/schema';
import { logger } from '@/infra/logger';
import { structuredLogger } from '@/infra/log/logger';
import { conversationService } from './conversation.service';
import { ecosystemEventsService } from '@/services/ecosystem-events.service';

const TWILIO_STATUS_MAP: Record<string, MessageDeliveryStatusType> = {
    queued: 'queued',
    accepted: 'queued',
    sending: 'sent',
    sent: 'sent',
    delivered: 'delivered',
    read: 'read',
    failed: 'failed',
    undelivered: 'failed',
};

const ALLOWED_STATUS_TRANSITIONS: Record<MessageDeliveryStatusType, readonly MessageDeliveryStatusType[]> = {
    queued: ['sent', 'delivered', 'read', 'failed'],
    sent: ['delivered', 'read', 'failed'],
    delivered: ['read'],
    read: [],
    failed: [],
};

export type TwilioDeliveryStatus = keyof typeof TWILIO_STATUS_MAP;

export interface DeliveryTrackingMetadataUpdate {
    sid: string;
    providerStatus: string | null;
    normalizedStatus: MessageDeliveryStatusType;
    statusUpdatedAt: Date;
    providerErrorCode?: string | null;
    providerErrorMessage?: string | null;
}

export interface UpdateDeliveryStatusParams {
    messageSid: string;
    providerStatus: string;
    callbackReceivedAt?: Date;
    providerErrorCode?: string | null;
    providerErrorMessage?: string | null;
}

export interface UpdateDeliveryStatusResult {
    outcome:
        | 'updated'
        | 'duplicate'
        | 'ignored_out_of_order'
        | 'ignored_unknown_status'
        | 'message_not_found'
        | 'ignored_non_outbound';
    tenantId?: string;
    conversationId?: string | null;
    messageId?: string;
    normalizedStatus?: MessageDeliveryStatusType;
    previousStatus?: MessageDeliveryStatusType | null;
    providerStatus: string;
}

function normalizeOptionalString(value: string | null | undefined): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asMetadataRecord(value: unknown): Record<string, unknown> {
    return isRecord(value) ? { ...value } : {};
}

function normalizeStoredDeliveryStatus(value: string | null | undefined): MessageDeliveryStatusType | null {
    const normalized = normalizeOptionalString(value);
    if (!normalized) return null;
    return Object.values(TWILIO_STATUS_MAP).includes(normalized as MessageDeliveryStatusType)
        ? (normalized as MessageDeliveryStatusType)
        : null;
}

export function normalizeTwilioDeliveryStatus(value: string | null | undefined): MessageDeliveryStatusType | null {
    const normalized = normalizeOptionalString(value)?.toLowerCase();
    return normalized ? TWILIO_STATUS_MAP[normalized] ?? null : null;
}

export function resolveInitialOutboundDeliveryStatus(value: string | null | undefined): MessageDeliveryStatusType {
    return normalizeTwilioDeliveryStatus(value) ?? 'queued';
}

export function classifyDeliveryStatusTransition(
    current: string | null | undefined,
    incoming: MessageDeliveryStatusType,
): 'apply' | 'duplicate' | 'out_of_order' {
    const normalizedCurrent = normalizeStoredDeliveryStatus(current);
    if (!normalizedCurrent) return 'apply';
    if (normalizedCurrent === incoming) return 'duplicate';

    return ALLOWED_STATUS_TRANSITIONS[normalizedCurrent].includes(incoming) ? 'apply' : 'out_of_order';
}

export function mergeMessageDeliveryTrackingMetadata(
    existingMetadata: Record<string, unknown> | null | undefined,
    update: DeliveryTrackingMetadataUpdate,
): Record<string, unknown> {
    const metadata = asMetadataRecord(existingMetadata);
    const deliveryTracking = asMetadataRecord(metadata.deliveryTracking);
    const statusUpdatedAt = update.statusUpdatedAt.toISOString();

    return {
        ...metadata,
        twilioSid: update.sid,
        twilioStatus: update.providerStatus,
        twilioNormalizedStatus: update.normalizedStatus,
        twilioStatusUpdatedAt: statusUpdatedAt,
        twilioErrorCode: update.providerErrorCode ?? null,
        twilioErrorMessage: update.providerErrorMessage ?? null,
        deliveryTracking: {
            ...deliveryTracking,
            provider: 'twilio',
            sid: update.sid,
            providerStatus: update.providerStatus,
            normalizedStatus: update.normalizedStatus,
            lastUpdatedAt: statusUpdatedAt,
            providerErrorCode: update.providerErrorCode ?? null,
            providerErrorMessage: update.providerErrorMessage ?? null,
        },
    };
}

function buildFailureEventPayload(params: {
    message: ConversationMessageRecord;
    messageSid: string;
    providerStatus: string;
    normalizedStatus: MessageDeliveryStatusType;
    callbackReceivedAt: Date;
    providerErrorCode?: string | null;
    providerErrorMessage?: string | null;
}) {
    return {
        tenantId: params.message.tenantId,
        conversationId: params.message.conversationId,
        messageId: params.message.id,
        sid: params.messageSid,
        providerStatus: params.providerStatus,
        normalizedStatus: params.normalizedStatus,
        timestamp: params.callbackReceivedAt.toISOString(),
        providerErrorCode: params.providerErrorCode ?? null,
        providerErrorMessage: params.providerErrorMessage ?? null,
    } satisfies Record<string, unknown>;
}

export const whatsappDeliveryStatusService = {
    async updateDeliveryStatus(params: UpdateDeliveryStatusParams): Promise<UpdateDeliveryStatusResult> {
        const messageSid = normalizeOptionalString(params.messageSid);
        const providerStatus = normalizeOptionalString(params.providerStatus) ?? params.providerStatus;
        const callbackReceivedAt = params.callbackReceivedAt ?? new Date();
        const providerErrorCode = normalizeOptionalString(params.providerErrorCode);
        const providerErrorMessage = normalizeOptionalString(params.providerErrorMessage);
        const normalizedStatus = normalizeTwilioDeliveryStatus(providerStatus);

        if (!messageSid || !normalizedStatus) {
            structuredLogger.warn('whatsapp_delivery_status_unknown', {
                messageSid: messageSid ?? null,
                providerStatus,
                providerErrorCode,
            });

            return {
                outcome: 'ignored_unknown_status',
                providerStatus,
            };
        }

        const existing = await conversationService.getMessageByProviderMessageId(messageSid);
        if (!existing) {
            structuredLogger.info('whatsapp_delivery_status_message_missing', {
                messageSid,
                providerStatus,
                normalizedStatus,
            });

            return {
                outcome: 'message_not_found',
                normalizedStatus,
                providerStatus,
            };
        }

        if (existing.direction !== 'outbound') {
            structuredLogger.warn('whatsapp_delivery_status_non_outbound', {
                tenantId: existing.tenantId,
                messageId: existing.id,
                conversationId: existing.conversationId,
                messageSid,
                providerStatus,
            });

            return {
                outcome: 'ignored_non_outbound',
                tenantId: existing.tenantId,
                conversationId: existing.conversationId,
                messageId: existing.id,
                normalizedStatus,
                previousStatus: existing.deliveryStatus,
                providerStatus,
            };
        }

        const transition = classifyDeliveryStatusTransition(existing.deliveryStatus, normalizedStatus);
        if (transition !== 'apply') {
            structuredLogger.info('whatsapp_delivery_status_ignored', {
                tenantId: existing.tenantId,
                messageId: existing.id,
                conversationId: existing.conversationId,
                messageSid,
                previousStatus: existing.deliveryStatus,
                providerStatus,
                normalizedStatus,
                reason: transition,
            });

            return {
                outcome: transition === 'duplicate' ? 'duplicate' : 'ignored_out_of_order',
                tenantId: existing.tenantId,
                conversationId: existing.conversationId,
                messageId: existing.id,
                normalizedStatus,
                previousStatus: existing.deliveryStatus,
                providerStatus,
            };
        }

        const metadata = mergeMessageDeliveryTrackingMetadata(
            (existing.metadata as Record<string, unknown> | null | undefined) ?? null,
            {
                sid: messageSid,
                providerStatus,
                normalizedStatus,
                statusUpdatedAt: callbackReceivedAt,
                providerErrorCode,
                providerErrorMessage,
            },
        );

        try {
            const db = await getDb();
            const failurePayload = buildFailureEventPayload({
                message: existing,
                messageSid,
                providerStatus,
                normalizedStatus,
                callbackReceivedAt,
                providerErrorCode,
                providerErrorMessage,
            });

            await db.transaction(async (tx) => {
                await tx.update(conversationMessages)
                    .set({
                        deliveryStatus: normalizedStatus,
                        metadata,
                    })
                    .where(and(
                        eq(conversationMessages.id, existing.id),
                        eq(conversationMessages.tenantId, existing.tenantId),
                    ));

                if (normalizedStatus === 'failed' && existing.conversationId) {
                    await tx.update(conversations)
                        .set({ status: 'failed_delivery' })
                        .where(and(
                            eq(conversations.id, existing.conversationId),
                            eq(conversations.tenantId, existing.tenantId),
                        ));
                }

                await tx.insert(operationalEvents).values({
                    id: randomUUID(),
                    tenantId: existing.tenantId,
                    eventType: 'delivery_status_changed',
                    eventDomain: 'OPERATIONS',
                    entityId: existing.id,
                    payload: {
                        conversationId: existing.conversationId,
                        messageId: existing.id,
                        sid: messageSid,
                        previousStatus: existing.deliveryStatus ?? null,
                        normalizedStatus,
                        providerStatus,
                        timestamp: callbackReceivedAt.toISOString(),
                    },
                });

                if (normalizedStatus === 'failed') {
                    await tx.insert(operationalEvents).values({
                        id: randomUUID(),
                        tenantId: existing.tenantId,
                        eventType: 'MESSAGE_DELIVERY_FAILED',
                        eventDomain: 'OPERATIONS',
                        entityId: existing.conversationId ?? existing.id,
                        payload: failurePayload,
                    });
                }
            });

            if (normalizedStatus === 'failed') {
                void ecosystemEventsService.emitEvent({
                    tenantId: existing.tenantId,
                    type: 'message_delivery_failed',
                    entityType: 'conversation_message',
                    entityId: existing.id,
                    payload: failurePayload,
                    actor: 'system',
                    source: 'whatsapp_status',
                }).catch((error) => {
                    logger.error('whatsapp_delivery_failure_ecosystem_event_failed', error as Error, {
                        tenantId: existing.tenantId,
                        messageId: existing.id,
                        messageSid,
                    });
                });

                structuredLogger.info('whatsapp_delivery_failure_event_published', {
                    tenantId: existing.tenantId,
                    conversationId: existing.conversationId,
                    messageId: existing.id,
                    messageSid,
                    providerStatus,
                    normalizedStatus,
                    providerErrorCode,
                });
            }

            structuredLogger.info('whatsapp_delivery_status_updated', {
                tenantId: existing.tenantId,
                conversationId: existing.conversationId,
                messageId: existing.id,
                messageSid,
                previousStatus: existing.deliveryStatus,
                providerStatus,
                normalizedStatus,
            });

            return {
                outcome: 'updated',
                tenantId: existing.tenantId,
                conversationId: existing.conversationId,
                messageId: existing.id,
                normalizedStatus,
                previousStatus: existing.deliveryStatus,
                providerStatus,
            };
        } catch (error) {
            logger.error('whatsapp_delivery_status_persist_failed', error as Error, {
                tenantId: existing.tenantId,
                conversationId: existing.conversationId,
                messageId: existing.id,
                messageSid,
                providerStatus,
                normalizedStatus,
            });
            throw error;
        }
    },
};
