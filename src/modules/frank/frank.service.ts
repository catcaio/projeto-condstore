import { logger } from '@/infra/logger';
import { getDb } from '@/infra/db';
import { eq, and } from 'drizzle-orm';
import { crmTasks, simulations, conversations } from '@/drizzle/schema';
import { frankContextBuilder } from './frank.context-builder';
import { randomUUID } from 'crypto';
import { crmService } from '@/modules/crm/server';
import { frankSuggestions } from './frank.suggestions';
import { FrankOperationalDraft } from './frank.schema';

export const frankService = {
    /**
     * Passively generates analytical suggestions without interacting with the DB writes or messaging.
     * This acts purely as an observing copilot for the frontend Cockpit UI.
     */
    async generateCopilotSuggestions(tenantId: string, conversationId: string, operatorId: string): Promise<FrankOperationalDraft> {
        logger.info('Frank Passive Copilot invoked', {
            tenantId,
            conversationId,
            operatorId,
            action: 'generate_suggestions'
        });

        const start = Date.now();

        try {
            // 1. Compile 360 Context Limit
            const contextPayload = await frankContextBuilder.buildContext(tenantId, conversationId);

            // 2. Pass context to LLM Prompter for JSON Parsing
            const suggestions = await frankSuggestions.generateSuggestions(contextPayload);

            const duration = Date.now() - start;
            logger.info('Frank Passive Copilot success', {
                tenantId,
                conversationId,
                operatorId,
                durationMs: duration,
                suggestedAction: suggestions.suggestedAction
            });

            return suggestions;

        } catch (error: any) {
            logger.error('Failed to generate Frank Copilot context/suggestions', error, {
                tenantId,
                conversationId,
                operatorId
            });

            // Return safe fallback
            return {
                summary: "Falha técnica ao tentar ler o contexto da conversa.",
                suggestedReplyDraft: null,
                suggestedAction: "NONE",
                actionPayload: null,
                insights: ["Ocorreu um erro interno. Tente novamente mais tarde."],
                warnings: [],
                confidence: "LOW"
            };
        }
    },

    /**
     * Executes the explicit human approval of an AI drafted action.
     * Guaranteed to NOT send real messages or convert stages blindly.
     */
    async approveOperationalDraft(tenantId: string, conversationId: string, payload: any): Promise<boolean> {
        const { operatorId, action, actionPayload } = payload;
        logger.info('Frank Draft Approved By Human', { tenantId, conversationId, operatorId, action });

        const db = await getDb();
        const [conversation] = await db.select().from(conversations)
            .where(and(eq(conversations.id, conversationId), eq(conversations.tenantId, tenantId)))
            .limit(1);

        if (!conversation) {
            throw new Error('Conversation not found');
        }

        const customerId = conversation.customerId;

        if (action === 'FOLLOW_UP_TASK') {
            await db.insert(crmTasks).values({
                id: randomUUID(),
                tenantId,
                customerId: customerId || conversationId, // Fallback if no customer created yet
                conversationId,
                assignedOperatorId: operatorId,
                title: actionPayload?.title || 'Revisar acompanhamento pendente',
                dueAt: actionPayload?.dueAt ? new Date(actionPayload.dueAt) : null,
                status: 'OPEN',
                createdAt: new Date(),
                updatedAt: new Date()
            });

            logger.info('Frank Assisted CRM Task created', { tenantId, operatorId, conversationId });
            return true;
        }

        if (action === 'CREATE_QUOTE_DRAFT') {
            const quoteId = randomUUID();
            await db.insert(simulations).values({
                id: quoteId,
                tenantId,
                customerId: customerId || conversationId,
                conversationId,
                createdBy: operatorId, // Owner mapping
                source: 'FRANK_APPROVED_BY_HUMAN',
                cep: '00000000', // Empty placeholder for draft
                weight: '1.0',
                quantity: 1,
                event: 'QUOTE_DRAFTED',
                status: 'DRAFT',
                items: actionPayload?.items || null,
                totalAmount: actionPayload?.total ? String(actionPayload.total) : null,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            const syncResult = await crmService.syncSimulationToQuote({
                tenantId,
                customerId: customerId || undefined,
                conversationId,
                quoteId,
                status: 'DRAFT',
                subtotal: actionPayload?.total ? String(actionPayload.total) : '0',
                freightAmount: '0',
                totalAmount: actionPayload?.total ? String(actionPayload.total) : '0',
                items: actionPayload?.items ? actionPayload.items.map((i: any) => ({
                    description: i.name || 'Produto Base',
                    quantity: i.quantity || 1,
                    unitPrice: i.price || 0,
                    totalPrice: (i.price || 0) * (i.quantity || 1)
                })) : []
            });

            if (syncResult.opportunityId) {
                await crmService.scheduleQuoteFollowUp({
                    tenantId,
                    quoteId,
                    opportunityId: syncResult.opportunityId,
                    hoursDelay: 24 // Frank quotes should have a slightly tighter SLA
                });
            }

            logger.info('Frank Assisted Quote Draft created', { tenantId, operatorId, conversationId });
            return true;
        }

        return false;
    }
};
