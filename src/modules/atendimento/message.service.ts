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
import { conversationRepository } from './conversation.repository';
import { messageRepository } from '@/infra/repositories/message.repository';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import { logger } from '@/infra/logger';
import { type ConversationMessageRecord } from '@/drizzle/schema';

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
        // Idempotency check: Don't insert duplicate webhook retries.
        const db = await import('@/infra/db').then(m => m.getDb());
        const { conversationMessages } = await import('@/drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        
        const [existing] = await db.select()
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

        const inboundMessage = await conversationRepository.appendInboundMessage(
            params.tenantId,
            params.conversationId,
            params.message,
            metadata,
            params.messageSid
        );

        try {
            await messageRepository.saveInboundMessage({
                messageSid: params.messageSid,
                tenantId: params.tenantId,
                fromPhone: params.fromPhone,
                toPhone: params.toPhone,
                body: params.message,
                direction: 'inbound',
                intent: params.intent,
                intentConfidence: params.intentConfidence !== null ? params.intentConfidence.toString() : null,
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

        await publishOperationalEvent({
            tenantId: params.tenantId,
            eventType: 'message_received',
            eventDomain: 'OPERATIONS',
            customerId: params.customerId ?? null,
            payload: {
                conversationId: params.conversationId,
                channel: 'WHATSAPP',
                messageId: inboundMessage.id,
                contactId: params.contactId ?? null,
                organizationId: params.organizationId ?? null,
                intent: params.intent,
                unidentified: !params.customerId,
                messageSid: params.messageSid,
            }
        });

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

        const outboundMessage = await conversationRepository.appendOutboundMessage(
            params.tenantId,
            params.conversationId,
            params.message,
            params.source,
            outboundMetadata,
            params.options
        );

        await publishOperationalEvent({
            tenantId: params.tenantId,
            eventType: 'message_sent',
            eventDomain: 'OPERATIONS',
            customerId: params.customerId ?? null,
            payload: {
                conversationId: params.conversationId,
                source: params.source,
                messageId: outboundMessage.id,
            }
        });

        return outboundMessage;
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
