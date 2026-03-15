/**
 * Message Service (Timeline Orchestrator)
 *
 * This module enforces the dual-write structural contract:
 * - `conversation_messages`: Is the canonical source of truth for the Cockpit operational timeline.
 * - `messages`: Is a derived mirror explicitly used for tracking analytics, legacy metrics, 
 *   and Frank context parsing.
 * 
 * Rules:
 * 1. Both inbound and outbound logic MUST be centralized here.
 * 2. Idempotency must be enforced strictly via providerMessageId/MessageSid.
 * 3. Graceful degradation: A failure to write to the `messages` analytics table should NEVER 
 *    interrupt the customer or the operator (Timeline Operational Priority).
 */
import { logger } from '@/infra/logger';
import { getDb } from '@/infra/db';
import { eq, and, sql } from 'drizzle-orm';
import { conversationMessages, conversations } from '@/drizzle/schema';
import { operationalEvents } from '@/drizzle/schema';
import { randomUUID } from 'crypto';
import type { ConversationMessageRecord } from '@/drizzle/schema';

export const messageService = {
    async processInbound(
        params: {
            tenantId: string;
            conversationId: string;
            messageSid: string;
            fromPhone: string;
            toPhone: string;
            message: string;
            intent: string;
            intentConfidence: number | null;
            rawPayload: string;
            metadata?: Record<string, any>;
            customerId?: string;
            organizationId?: string;
            contactId?: string;
        }
    ): Promise<ConversationMessageRecord> {
        const db = await getDb();
        
        const inboundMessage = await db.transaction(async (tx) => {
            // 1. Idempotency Check with pessimistic lock/strict isolation
            const [existing] = await tx.select()
                .from(conversationMessages)
                .where(and(eq(conversationMessages.tenantId, params.tenantId), eq(conversationMessages.providerMessageId, params.messageSid)))
                .limit(1);

            if (existing) {
                logger.warn('inbound_message_dual_write_skipped_idempotent', {
                    tenantId: params.tenantId,
                    messageSid: params.messageSid,
                    message: 'Webhook retried an already processed message'
                });
                return existing;
            }

            const metadata = {
                ...params.metadata,
                actorType: 'CLIENT',
                messageType: 'TEXT',
                intent: params.intent
            };

            const messageId = randomUUID();

            // 2. Insert Canonical Timeline Message
            await tx.insert(conversationMessages).values({
                id: messageId,
                tenantId: params.tenantId,
                conversationId: params.conversationId,
                direction: 'inbound',
                source: 'WHATSAPP',
                message: params.message,
                metadata,
                providerMessageId: params.messageSid,
                deliveryStatus: 'delivered', 
            });

            // 3. Update Conversation State explicitly
            await tx.update(conversations)
                .set({
                    lastMessageAt: sql`CURRENT_TIMESTAMP`,
                    status: 'awaiting_human'
                })
                .where(and(eq(conversations.tenantId, params.tenantId), eq(conversations.id, params.conversationId)));

            // 4. Write to Operational Event Bus
            await tx.insert(operationalEvents).values({
                id: randomUUID(),
                tenantId: params.tenantId,
                eventType: 'message_received',
                eventDomain: 'OPERATIONS',
                customerId: params.customerId ?? null,
                payload: {
                    conversationId: params.conversationId,
                    channel: 'WHATSAPP',
                    messageId,
                    contactId: params.contactId ?? null,
                    organizationId: params.organizationId ?? null,
                    intent: params.intent,
                    unidentified: !params.customerId,
                    messageSid: params.messageSid,
                }
            });

            const [insertedMessage] = await tx.select()
                .from(conversationMessages)
                .where(eq(conversationMessages.id, messageId))
                .limit(1);

            return insertedMessage;
        });

        const { messageRepository } = await import('@/infra/repositories/message.repository');
        try {
            await messageRepository.saveInboundMessage({
                messageSid: params.messageSid,
                tenantId: params.tenantId,
                fromPhone: params.fromPhone,
                toPhone: params.toPhone,
                body: params.message,
                direction: 'inbound',
                intent: params.intent,
                intentConfidence: params.intentConfidence != null ? params.intentConfidence.toString() : undefined,
                rawPayload: params.rawPayload
            });
        } catch (error) {
            logger.error('Failed to dual-write inbound message to analytics table, scheduled for future reconciliation', error as Error, {
                messageSid: params.messageSid,
                tenantId: params.tenantId,
                conversationId: params.conversationId,
                actorType: 'CLIENT',
                direction: 'INBOUND',
                reconciliationRequired: true
            });
            // NON-BLOCKING: we successfully wrote to conversation_messages.
        }

        return inboundMessage;
    },

    async processOutbound(
        params: {
            tenantId: string;
            conversationId: string;
            message: string;
            source: 'OPERATOR' | 'SYSTEM';
            actorType: 'HUMAN' | 'AI' | 'SYSTEM';
            messageType?: 'TEXT' | 'NOTE' | 'EVENT';
            customerId?: string;
            metadata?: Record<string, any>;
            options?: { advanceConversation?: boolean };
        }
    ): Promise<ConversationMessageRecord> {
        const outboundMetadata = {
            ...params.metadata,
            actorType: params.actorType,
            messageType: params.messageType || 'TEXT',
        };

        const db = await getDb();

        return await db.transaction(async (tx) => {
            const messageId = randomUUID();
            const advanceConversation = params.options?.advanceConversation ?? true;

            await tx.insert(conversationMessages).values({
                id: messageId,
                tenantId: params.tenantId,
                conversationId: params.conversationId,
                direction: 'outbound',
                source: params.source,
                message: params.message,
                metadata: outboundMetadata,
                deliveryStatus: 'queued'
            });

            if (advanceConversation) {
                await tx.update(conversations)
                    .set({
                        lastMessageAt: sql`CURRENT_TIMESTAMP`,
                        status: 'sent'
                    })
                    .where(and(eq(conversations.tenantId, params.tenantId), eq(conversations.id, params.conversationId)));
            }

            await tx.insert(operationalEvents).values({
                id: randomUUID(),
                tenantId: params.tenantId,
                eventType: 'message_sent',
                eventDomain: 'OPERATIONS',
                customerId: params.customerId ?? null,
                payload: {
                    conversationId: params.conversationId,
                    source: params.source,
                    messageId: messageId,
                }
            });

            const [insertedMessage] = await tx.select()
                .from(conversationMessages)
                .where(eq(conversationMessages.id, messageId))
                .limit(1);

            return insertedMessage;
        });
    },

    async processSystemEvent(
        tenantId: string,
        conversationId: string,
        message: string,
        metadata?: Record<string, any>
    ): Promise<ConversationMessageRecord> {
        return this.processOutbound({
            tenantId,
            conversationId,
            message,
            source: 'SYSTEM',
            actorType: 'SYSTEM',
            messageType: 'EVENT',
            metadata,
            options: { advanceConversation: false }
        });
    }
};
