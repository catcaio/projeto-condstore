import { logger } from '@/infra/logger';
import { getDb } from '@/infra/db';
import { crmQuotes } from '@/drizzle/schema';
import { randomUUID } from 'crypto';
import { ecosystemEventsService } from '@/services/ecosystem-events.service';
import { operationalAuditService } from '@/modules/audit/operational-audit.service';
import { crmRepository } from './crm.repository';

// ── Public service ─────────────────────────────────────────────────────────

export const crmService = {
    /**
     * Projects a WhatsApp Interaction into the CRM Pipeline.
     * Ensures an open opportunity exists for the customer and updates its last activity.
     */
    async projectMessageActivity(
        params: {
            tenantId: string;
            customerId?: string;
            conversationId?: string;
            message: string;
            direction: 'inbound' | 'outbound';
        },
        tx?: any // Optional Drizzle transaction
    ): Promise<void> {
        if (!params.customerId) {
            // Unidentified leads cannot have a formal CRM opportunity yet.
            // They need to be triaged and mapped to a Customer first.
            return;
        }

        try {
            const activeOp = await crmRepository.findActiveOpportunity(params.tenantId, params.customerId, tx);

            if (activeOp) {
                await crmRepository.updateOpportunity(params.tenantId, activeOp.id, {
                    lastActivityAt: new Date(),
                    updatedAt: new Date(),
                }, tx);
            } else if (params.direction === 'inbound') {
                const title = `Negociação Automática`;
                const newOpportunityId = randomUUID();
                await crmRepository.createOpportunity({
                    id: newOpportunityId,
                    tenantId: params.tenantId,
                    customerId: params.customerId,
                    title,
                    stage: 'new_lead',
                    status: 'active',
                    lastActivityAt: new Date(),
                }, tx);

                // Emit Ecosystem Event
                await ecosystemEventsService.emitEvent({
                    tenantId: params.tenantId,
                    type: 'lead_created',
                    entityType: 'opportunity',
                    entityId: newOpportunityId,
                    payload: { customerId: params.customerId, conversationId: params.conversationId },
                    actor: 'SYSTEM',
                    source: 'WHATSAPP_INBOUND',
                });

                // Emit Audit Log
                await operationalAuditService.logActivity({
                    tenantId: params.tenantId,
                    entityType: 'opportunity',
                    entityId: newOpportunityId,
                    actionType: 'lead_created',
                    origin: 'system',
                    metadata: { customerId: params.customerId, conversationId: params.conversationId },
                });
            }
        } catch (error) {
            logger.error('Failed to project message to CRM opportunity', error as Error, {
                tenantId: params.tenantId,
                customerId: params.customerId,
            });
            // We do not rethrow to avoid blocking the critical transactional messaging path
        }
    },

    /**
     * Synchronizes a legacy Simulation/Quote generation into the formal CRM Quotes structure.
     */
    async syncSimulationToQuote(
        params: {
            tenantId: string;
            customerId?: string;
            conversationId?: string;
            quoteId: string;
            status: string;
            subtotal: string;
            freightAmount: string;
            totalAmount: string;
            discountAmount?: string;
            expiresAt?: Date | null;
            items?: Array<{
                description: string;
                quantity: number;
                unitPrice: number;
                totalPrice: number;
            }>;
        },
        tx?: any
    ): Promise<{ opportunityId?: string }> {
        if (!params.customerId) return { opportunityId: undefined }; // Cannot attach quote to unidentified lead
        
        const db = tx ?? await getDb();

        try {
            const activeOp = await crmRepository.findActiveOpportunity(params.tenantId, params.customerId, db);

            let opportunityId;

            if (activeOp) {
                opportunityId = activeOp.id;
                await crmRepository.updateOpportunity(params.tenantId, opportunityId, {
                    stage: 'quoted',
                    lastActivityAt: new Date(),
                    updatedAt: new Date(),
                }, db);

                // Emit lead_stage_changed ecosystem event
                ecosystemEventsService.emitEvent({
                    tenantId: params.tenantId,
                    type: 'lead_stage_changed',
                    entityType: 'opportunity',
                    entityId: opportunityId,
                    payload: { newStage: 'quoted', customerId: params.customerId },
                    actor: 'system',
                    source: 'crm',
                }).catch(() => {});
            } else {
                opportunityId = randomUUID();
                await crmRepository.createOpportunity({
                    id: opportunityId,
                    tenantId: params.tenantId,
                    customerId: params.customerId,
                    title: `Cotação ${params.quoteId.split('-')[0]}`,
                    stage: 'quoted',
                    status: 'active',
                    lastActivityAt: new Date(),
                }, db);
            }

            // Sync Quote
            const quoteData = {
                id: params.quoteId,
                tenantId: params.tenantId,
                opportunityId,
                status: params.status.toLowerCase(), // mapping DRAFT to draft
                subtotal: params.subtotal,
                freightAmount: params.freightAmount,
                discountAmount: params.discountAmount || '0',
                totalAmount: params.totalAmount,
                validUntil: params.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                updatedAt: new Date(),
            };

            // Using onDuplicateKeyUpdate in case it's a quote revision
            await db.insert(crmQuotes)
                .values({ ...quoteData, createdAt: new Date() })
                .onDuplicateKeyUpdate({ set: quoteData });

            if (params.items && params.items.length > 0) {
                const itemValues = params.items.map(i => ({
                    id: randomUUID(),
                    tenantId: params.tenantId,
                    quoteId: params.quoteId,
                    description: i.description,
                    quantity: i.quantity,
                    unitPrice: String(i.unitPrice),
                    totalPrice: String(i.totalPrice),
                    createdAt: new Date(),
                }));

                await crmRepository.replaceQuoteItems(params.tenantId, params.quoteId, itemValues, db);
            }

            // Emit Ecosystem Event
            await ecosystemEventsService.emitEvent({
                tenantId: params.tenantId,
                type: 'quote_generated',
                entityType: 'quote',
                entityId: params.quoteId,
                payload: { opportunityId, totalAmount: params.totalAmount, conversationId: params.conversationId },
                actor: 'SYSTEM',
                source: 'FRANK_SIMULATION',
            });

            // Emit Audit Log
            await operationalAuditService.logActivity({
                tenantId: params.tenantId,
                entityType: 'opportunity',
                entityId: opportunityId,
                actionType: 'quote_generated',
                origin: 'frank',
                metadata: { quoteId: params.quoteId, totalAmount: params.totalAmount, conversationId: params.conversationId },
            });

            return { opportunityId };

        } catch (error) {
            logger.error('Failed to sync simulation to CRM quote', error as Error, {
                tenantId: params.tenantId,
                quoteId: params.quoteId,
            });
            return { opportunityId: undefined };
        }
    },

    /**
     * Automatically schedules a follow-up for a specific quote after X hours/days
     */
    async scheduleQuoteFollowUp(
        params: {
            tenantId: string;
            opportunityId: string;
            quoteId: string;
            hoursDelay?: number;
        },
        tx?: any
    ): Promise<void> {
        const hours = params.hoursDelay || 48; // Default 48 hours for a quote follow up
        const scheduledAt = new Date(Date.now() + hours * 60 * 60 * 1000);
        const followUpId = randomUUID();

        try {
            await crmRepository.createFollowUp({
                id: followUpId,
                tenantId: params.tenantId,
                opportunityId: params.opportunityId,
                scheduledAt,
                description: `Follow-up automático da cotação ${params.quoteId.split('-')[0]}`,
                status: 'pending',
                createdAt: new Date(),
            }, tx);
            
            // Emit Ecosystem Event
            await ecosystemEventsService.emitEvent({
                tenantId: params.tenantId,
                type: 'followup_scheduled',
                entityType: 'follow_up',
                entityId: followUpId,
                payload: { opportunityId: params.opportunityId, quoteId: params.quoteId, scheduledAt },
                actor: 'SYSTEM',
                source: 'AUTO_SCHEDULER',
            });

            // Emit Audit Log
            await operationalAuditService.logActivity({
                tenantId: params.tenantId,
                entityType: 'opportunity',
                entityId: params.opportunityId,
                actionType: 'followup_scheduled',
                origin: 'system',
                metadata: { quoteId: params.quoteId, followUpId, scheduledAt },
            });

            logger.info('Scheduled automatic quote follow-up', {
                tenantId: params.tenantId,
                quoteId: params.quoteId,
                opportunityId: params.opportunityId,
            });
        } catch (err) {
            logger.error('Failed to schedule CRM quote follow-up', err as Error);
        }
    }
};
