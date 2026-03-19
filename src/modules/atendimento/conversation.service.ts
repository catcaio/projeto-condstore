import { conversationRepository, type ConversationListFilter } from './conversation.repository';
import { type ConversationRecord, type ConversationMessageRecord, type ConversationStatusType } from '@/drizzle/schema';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import { ecosystemEventsService } from '@/services/ecosystem-events.service';

export class ConversationStageConflictError extends Error {
    constructor(message: string = 'Conversation stage changed by another operator') {
        super(message);
        this.name = 'ConversationStageConflictError';
    }
}

export const conversationService = {
    async findOrCreateConversationByPhone(
        tenantId: string,
        phoneHash: string,
        phoneEncrypted: string,
        identity?: { customerId?: string | null; organizationId?: string | null },
    ): Promise<ConversationRecord> {
        return conversationRepository.findOrCreateConversationByPhone(tenantId, phoneHash, phoneEncrypted, identity);
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

    async hasRecentOperatorMessage(tenantId: string, conversationId: string, minutes: number = 15): Promise<boolean> {
        return conversationRepository.hasRecentOperatorMessage(tenantId, conversationId, minutes);
    },

    async loadConversationContext(tenantId: string, conversationId: string) {
        return conversationRepository.loadConversationContext(tenantId, conversationId);
    },


    async processOutboundMessage(
        tenantId: string,
        conversationId: string,
        message: string,
        source: 'OPERATOR' | 'SYSTEM' = 'OPERATOR',
        customerId?: string,
        metadata?: Record<string, any>,
        options?: { advanceConversation?: boolean }
    ): Promise<ConversationMessageRecord> {
        const { messageService } = await import('./message.service');
        const actorType = metadata?.actorType || (source === 'OPERATOR' ? 'HUMAN' : 'SYSTEM');
        const messageType = metadata?.messageType || 'TEXT';

        return messageService.processOutbound({
            tenantId,
            conversationId,
            message,
            source,
            actorType,
            messageType,
            customerId,
            metadata,
            options
        });
    },

    async updateMessageFields(
        tenantId: string,
        messageId: string,
        fields: {
            metadata?: Record<string, any>;
            providerMessageId?: string | null;
            deliveryStatus?: string | null;
        }
    ): Promise<ConversationMessageRecord | undefined> {
        return conversationRepository.updateConversationMessageFields(tenantId, messageId, fields);
    },

    async markConversationWaitingCustomer(tenantId: string, conversationId: string): Promise<void> {
        await conversationRepository.markConversationWaitingCustomer(tenantId, conversationId);
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

    async unassignConversation(
        tenantId: string,
        conversationId: string,
        customerId?: string
    ): Promise<void> {
        await conversationRepository.unassignConversation(tenantId, conversationId);

        if (customerId) {
            await publishOperationalEvent({
                tenantId,
                eventType: 'conversation_unassigned',
                eventDomain: 'OPERATIONS',
                customerId,
                payload: {
                    conversationId,
                }
            });
        }
    },

    async updateConversationStatus(
        tenantId: string,
        conversationId: string,
        status: ConversationStatusType,
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
    },

    async changeConversationStage(
        tenantId: string,
        conversationId: string,
        stage: 'NEW_LEAD' | 'IN_ATTENDANCE' | 'QUOTED' | 'WON' | 'LOST',
        customerId?: string,
        lostReason?: string
    ): Promise<void> {
        const stageRanks: Record<string, number> = {
            'NEW_LEAD': 1,
            'IN_ATTENDANCE': 2,
            'QUOTED': 3,
            'WON': 4,
            'LOST': 4
        };

        const existingConv = await conversationRepository.getConversationById(tenantId, conversationId);
        if (!existingConv) return; // Silent discard

        const currentRank = existingConv.stage ? stageRanks[existingConv.stage] || 0 : 0;
        const newRank = stageRanks[stage] || 0;

        if (newRank <= currentRank && existingConv.stage !== 'NEW_LEAD') {
            // Prevent backwards regression (and self re-assigning same generic stage to skip useless events)
            // Exception: allowing updates if they somehow have no stage
            return;
        }

        if (stage === 'LOST' && !lostReason) {
            // Business rule: lost needs a reason now
            // But we don't throw to not break historic syncs, just save it as generic
            lostReason = 'No reason provided';
        }

        const updated = await conversationRepository.updateConversationStage(
            tenantId,
            conversationId,
            existingConv.version,
            stage,
            lostReason
        );

        if (!updated) {
            throw new ConversationStageConflictError();
        }

        // Emit ecosystem event for stage change
        ecosystemEventsService.emitEvent({
            tenantId,
            type: 'lead_stage_changed',
            entityType: 'conversation',
            entityId: conversationId,
            payload: { stage, previousStage: existingConv.stage, customerId },
            actor: 'system',
            source: 'atendimento',
        }).catch(() => {});

        if (customerId) {
            let eventType: 'conversation_stage_changed' | 'deal_won' | 'deal_lost' = 'conversation_stage_changed';
            if (stage === 'WON') eventType = 'deal_won';
            if (stage === 'LOST') eventType = 'deal_lost';

            await publishOperationalEvent({
                tenantId,
                eventType,
                eventDomain: 'OPERATIONS',
                customerId,
                payload: {
                    conversationId,
                    stage,
                    ...(stage === 'LOST' ? { lostReason } : {})
                }
            });
        }
    }
};
