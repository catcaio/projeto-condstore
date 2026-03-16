import { logger } from '@/infra/logger';
import { getDb } from '@/infra/db';
import { eq, and } from 'drizzle-orm';
import { crmOpportunities, crmQuotes, crmQuoteItems, crmFollowUps } from '@/drizzle/schema';
import { randomUUID } from 'crypto';

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

        const db = tx || await getDb();

        try {
            // Find active opportunity
            const activeOps = await db.select()
                .from(crmOpportunities)
                .where(
                    and(
                        eq(crmOpportunities.tenantId, params.tenantId),
                        eq(crmOpportunities.customerId, params.customerId),
                        eq(crmOpportunities.status, 'active')
                    )
                )
                .limit(1);

            if (activeOps.length > 0) {
                // Update last activity
                await db.update(crmOpportunities)
                    .set({ lastActivityAt: new Date() })
                    .where(eq(crmOpportunities.id, activeOps[0].id));
            } else if (params.direction === 'inbound') {
                // Create new opportunity if inbound message and no active ops
                const title = `Negociação Automática`;
                await db.insert(crmOpportunities).values({
                    id: randomUUID(),
                    tenantId: params.tenantId,
                    customerId: params.customerId,
                    title,
                    stage: 'new_lead',
                    status: 'active',
                    lastActivityAt: new Date(),
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
        
        const db = tx || await getDb();

        try {
            // Find active opportunity
            const activeOps = await db.select()
                .from(crmOpportunities)
                .where(
                    and(
                        eq(crmOpportunities.tenantId, params.tenantId),
                        eq(crmOpportunities.customerId, params.customerId),
                        eq(crmOpportunities.status, 'active')
                    )
                )
                .limit(1);

            let opportunityId;

            if (activeOps.length > 0) {
                opportunityId = activeOps[0].id;
                // Update stage to quoted if not already won/lost
                await db.update(crmOpportunities)
                    .set({ stage: 'quoted', lastActivityAt: new Date() })
                    .where(eq(crmOpportunities.id, opportunityId));
            } else {
                // Should exist due to message projection, but fallback just in case
                opportunityId = randomUUID();
                await db.insert(crmOpportunities).values({
                    id: opportunityId,
                    tenantId: params.tenantId,
                    customerId: params.customerId,
                    title: `Cotação ${params.quoteId.split('-')[0]}`,
                    stage: 'quoted',
                    status: 'active',
                    lastActivityAt: new Date(),
                });
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

            // Sync Quote Items
            if (params.items && params.items.length > 0) {
                // For simplicity, recreate items on revision
                await db.delete(crmQuoteItems)
                    .where(eq(crmQuoteItems.quoteId, params.quoteId));

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

                await db.insert(crmQuoteItems).values(itemValues);
            }

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
        const db = tx || await getDb();
        const hours = params.hoursDelay || 48; // Default 48 hours for a quote follow up
        const scheduledAt = new Date(Date.now() + hours * 60 * 60 * 1000);

        try {
            await db.insert(crmFollowUps).values({
                id: randomUUID(),
                tenantId: params.tenantId,
                opportunityId: params.opportunityId,
                scheduledAt,
                description: `Follow-up automático da cotação ${params.quoteId.split('-')[0]}`,
                status: 'pending',
                createdAt: new Date(),
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
