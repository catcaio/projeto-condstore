import { conversationRepository, type ConversationListFilter } from './conversation.repository';
import { type ConversationRecord, type ConversationMessageRecord } from '@/drizzle/schema';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import { logger } from '@/infra/logger';

export const conversationService = {
    async findOrCreateConversationByPhone(tenantId: string, phoneHash: string, phoneEncrypted: string): Promise<ConversationRecord> {
        return conversationRepository.findOrCreateConversationByPhone(tenantId, phoneHash, phoneEncrypted);
    },

    async listConversations(tenantId: string, filter: ConversationListFilter): Promise<ConversationRecord[]> {
        return conversationRepository.listConversations(tenantId, filter);
    },

    async getConversationById(tenantId: string, conversationId: string): Promise<ConversationRecord | undefined> {
        return conversationRepository.getConversationById(tenantId, conversationId);
    },
    
    async getConversationMessages(tenantId: string, conversationId: string): Promise<ConversationMessageRecord[]> {
        return conversationRepository.getConversationMessages(tenantId, conversationId);
    },

    async processInboundMessage(
        tenantId: string, 
        phoneHash: string,
        phoneEncrypted: string, 
        message: string, 
        customerId?: string,
        organizationId?: string,
        metadata?: Record<string, any>
    ): Promise<{ conversation: ConversationRecord, message: ConversationMessageRecord }> {
        const conversation = await conversationRepository.findOrCreateConversationByPhone(tenantId, phoneHash, phoneEncrypted);
        
        const inboundMessage = await conversationRepository.appendInboundMessage(
            tenantId, 
            conversation.id, 
            message, 
            metadata
        );

        // Timeline Event
        if (customerId) {
            await publishOperationalEvent({
                tenantId,
                eventType: 'message_received',
                eventDomain: 'OPERATIONS',
                customerId,
                payload: {
                    conversationId: conversation.id,
                    channel: conversation.channel,
                    messageId: inboundMessage.id,
                }
            });
        }

        return { conversation, message: inboundMessage };
    },

    async processOutboundMessage(
        tenantId: string,
        conversationId: string,
        message: string,
        source: 'OPERATOR' | 'SYSTEM' = 'OPERATOR',
        customerId?: string,
        metadata?: Record<string, any>
    ): Promise<ConversationMessageRecord> {
        const outboundMessage = await conversationRepository.appendOutboundMessage(
            tenantId, 
            conversationId, 
            message, 
            source, 
            metadata
        );

        // Timeline Event
        if (customerId) {
            await publishOperationalEvent({
                tenantId,
                eventType: 'message_sent',
                eventDomain: 'OPERATIONS',
                customerId,
                payload: {
                    conversationId,
                    source,
                    messageId: outboundMessage.id,
                }
            });
        }

        return outboundMessage;
    },

    async assignConversation(
        tenantId: string, 
        conversationId: string, 
        assignedTo: string, 
        assignedBy?: string,
        customerId?: string
    ): Promise<void> {
        await conversationRepository.assignConversation(tenantId, conversationId, assignedTo, assignedBy);

        if (customerId) {
            await publishOperationalEvent({
                tenantId,
                eventType: 'conversation_assigned',
                eventDomain: 'OPERATIONS',
                customerId,
                payload: {
                    conversationId,
                    assignedTo,
                    assignedBy
                }
            });
        }
    },

    async updateConversationStatus(
        tenantId: string, 
        conversationId: string, 
        status: 'OPEN' | 'WAITING_CUSTOMER' | 'WAITING_INTERNAL' | 'RESOLVED',
        customerId?: string
    ): Promise<void> {
        await conversationRepository.updateConversationStatus(tenantId, conversationId, status);

        if (customerId) {
            await publishOperationalEvent({
                tenantId,
                eventType: 'conversation_status_changed',
                eventDomain: 'OPERATIONS',
                customerId,
                payload: {
                    conversationId,
                    status
                }
            });
        }
    }
};
