
import { conversationState } from '../../drizzle/schema';
import { getDb } from '../../infra/db';
import { eq, and, gt } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { logger } from '../../infra/logger';
import { inboundMessageRepository } from '../llm/repositories/message.repository';

export interface ConversationContext {
    cep?: string;
    sessionId?: string; // Added sessionId
    [key: string]: any;
}

export type ConversationStep = 'NONE' | 'AWAITING_CEP' | 'COMPLETED';

export class ConversationService {

    // TTL in minutes
    private static readonly TTL_MINUTES = 30;

    async getState(tenantId: string, phoneNumber: string) {
        const db = await getDb();
        const now = new Date();

        // Query state without expiration filter first to handle abandonment logic
        const state = await db.query.conversationState.findFirst({
            where: (table, { eq, and }) => and(
                eq(table.tenantId, tenantId),
                eq(table.phoneNumber, phoneNumber)
            )
        });

        if (!state) {
            return null;
        }

        // Check if expired
        if (state.expiresAt < now) {
            // Expired. Check if it was abandoned (not completed)
            if (state.currentStep !== 'COMPLETED') {
                const context = state.contextJson as any;
                if (context?.sessionId) {
                    // Log ABANDONED event
                    inboundMessageRepository.saveFunnelEvent({
                        tenantId,
                        phoneNumber,
                        sessionId: context.sessionId,
                        stage: 'ABANDONED'
                    }).catch(err => logger.warn('Failed to log ABANDONED event', err));
                }
            }

            // Clear expired state
            await this.clearState(tenantId, phoneNumber);
            return null;
        }

        return state;
    }

    async updateState(tenantId: string, phoneNumber: string, step: ConversationStep, context: ConversationContext = {}) {
        const db = await getDb();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + ConversationService.TTL_MINUTES * 60000);

        try {
            await db.insert(conversationState).values({
                id: randomUUID(),
                tenantId,
                phoneNumber,
                currentStep: step,
                contextJson: context,
                updatedAt: now,
                expiresAt
            }).onDuplicateKeyUpdate({
                set: {
                    currentStep: step,
                    contextJson: context,
                    updatedAt: now,
                    expiresAt
                }
            });

            logger.info('Conversation state updated', { tenantId, phoneNumber, step, expiresAt });
        } catch (error) {
            logger.error('Failed to update conversation state', error as Error);
            throw error;
        }
    }

    async clearState(tenantId: string, phoneNumber: string) {
        const db = await getDb();
        await db.delete(conversationState)
            .where(and(eq(conversationState.tenantId, tenantId), eq(conversationState.phoneNumber, phoneNumber)));

        logger.info('Conversation state cleared', { tenantId, phoneNumber });
    }
}

export const conversationService = new ConversationService();
