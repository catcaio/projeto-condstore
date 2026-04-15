import { getDb, withTenantIdNotDeleted } from '@/infra/db';
import { simulations, crmQuotes, crmOpportunities, conversations } from '@/drizzle/schema';
import { freightService } from '../freight/freight.service';
import { domineIntakeService } from '@/domine/domine-intake.service';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '@/infra/logger';
import crypto from 'crypto';
import { crmService } from '@/modules/crm/server';
import { conversationService } from './conversation.service';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';

export interface CreateFreightQuoteInput {
    tenantId: string;
    conversationId: string;
    customerId?: string;
    operatorId: string;
    cep: string;
    weight: number;
    quantity: number;
    dimensions?: { width: number; height: number; length: number };
    items?: Array<{
        productId?: string;
        name: string;
        sku?: string;
        unitPrice: number;
        quantity: number;
    }>;
}

export class FreightQuoteService {
    
    /**
     * Creates a draft or directly simulates and saves a freight quote 
     * linked to a specific human conversation.
     */
    async simulateQuoteFromConversation(input: CreateFreightQuoteInput) {
        // 1. Calculate using core freight engine
        const result = await freightService.calculateFreight({
            tenantId: input.tenantId,
            destinationCep: input.cep,
            quantity: input.quantity,
            dimensions: input.dimensions,
            manualWeight: input.weight,
        });

        // 2. Identify best option
        const bestOption = result.options[0];
        const quoteId = crypto.randomUUID();
        const items = input.items || [];
        const subtotal = items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);
        const bestFreight = bestOption?.price ?? 0;
        const totalAmount = subtotal > 0 ? subtotal + bestFreight : bestFreight;

        const db = await getDb();
        // 3. Save to simulations table with conversation tracking
        await db.insert(simulations).values({
            id: quoteId,
            tenantId: input.tenantId,
            customerId: input.customerId,
            conversationId: input.conversationId,
            createdBy: input.operatorId,
            source: 'ATENDIMENTO',
            cep: input.cep,
            weight: input.weight.toString() as any,
            quantity: input.quantity,
            bestCarrier: bestOption?.carrier || null,
            bestService: bestOption?.service || null,
            bestPrice: bestOption ? bestOption.price.toString() as any : null,
            bestMargin: null, // Depending on future business rules
            event: 'QUOTE_COMPLETED',
            status: 'DRAFT',
            items: items.length > 0 ? items : null,
            subtotal: subtotal > 0 ? String(subtotal) : null,
            freightAmount: String(bestFreight),
            totalAmount: String(totalAmount),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days validity
        });

        // 4. Emit to timeline
        void domineIntakeService.publish({
            tenantId: input.tenantId,
            type: 'QUOTE_SIMULATED',
            source: 'cockpit',
            payload: {
                quoteId,
                conversationId: input.conversationId,
                customerId: input.customerId,
                operatorId: input.operatorId,
                cep: input.cep,
                bestPrice: bestOption?.price,
                }
        }).catch(e => logger.warn('Failed to emit QUOTE_SIMULATED', { error: e.message }));

        // 4.5 Update Conversation Stage to QUOTED
        await conversationService.changeConversationStage(
            input.tenantId,
            input.conversationId,
            'QUOTED',
            input.customerId || undefined
        );

        let quoteTimeMs: number | null = null;
        if (typeof (db as { select?: unknown }).select === 'function') {
            const [conversation] = await db
                .select({ createdAt: conversations.createdAt })
                .from(conversations)
                .where(
                    and(
                        eq(conversations.tenantId, input.tenantId),
                        eq(conversations.id, input.conversationId),
                    ),
                )
                .limit(1);

            quoteTimeMs = conversation?.createdAt
                ? Math.max(0, Date.now() - new Date(conversation.createdAt).getTime())
                : null;
        }

        // Emit operational event manually
        await publishOperationalEvent({
            tenantId: input.tenantId,
            eventType: 'quoted',
            eventDomain: 'CONVERSION',
            customerId: input.customerId,
            payload: { quoteId, conversationId: input.conversationId, quoteTimeMs }
        });

        await publishOperationalEvent({
            tenantId: input.tenantId,
            eventType: 'quote_created',
            eventDomain: 'CONVERSION',
            customerId: input.customerId,
            payload: { quoteId, conversationId: input.conversationId, quoteTimeMs }
        });

        // 5. Sync into CRM Opportunities & Quotes
        const syncResult = await crmService.syncSimulationToQuote({
            tenantId: input.tenantId,
            customerId: input.customerId,
            conversationId: input.conversationId,
            quoteId,
            status: 'DRAFT',
            subtotal: String(subtotal),
            freightAmount: String(bestFreight),
            totalAmount: String(totalAmount),
            items: items.map(i => ({
                description: i.name || 'Produto Base',
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                totalPrice: i.unitPrice * i.quantity
            }))
        });

        if (syncResult.opportunityId) {
            await crmService.scheduleQuoteFollowUp({
                tenantId: input.tenantId,
                quoteId,
                opportunityId: syncResult.opportunityId,
                hoursDelay: 48
            });
        }

        return {
            quoteId,
            ...result
        };
    }

    /**
     * Retrieves all quotes historically linked to a conversation
     */
    async listConversationQuotes(tenantId: string, conversationId: string) {
        const db = await getDb();
        return await db.select()
            .from(simulations)
            .where(
                and(
                    eq(simulations.tenantId, tenantId),
                    eq(simulations.conversationId, conversationId)
                )
            )
            .orderBy(desc(simulations.createdAt));
    }

    /**
     * Retrieves a quote by its ID
     */
    async getQuoteById(tenantId: string, quoteId: string) {
        const db = await getDb();
        const results = await db.select()
            .from(simulations)
            .where(
                and(
                    eq(simulations.tenantId, tenantId),
                    eq(simulations.id, quoteId)
                )
            )
            .limit(1);
        
        return results[0] || null;
    }
    /**
     * Revises an existing quote, re-calculating totals safely
     */
    async reviseQuote(tenantId: string, quoteId: string, updates: {
        items?: Array<{
            productId?: string;
            name: string;
            sku?: string;
            unitPrice: number;
            quantity: number;
        }>;
        discountAmount?: number;
        expiresAt?: Date;
    }) {
        const db = await getDb();
        const quote = await this.getQuoteById(tenantId, quoteId);
        
        if (!quote) throw new Error('Quote not found');
        if (['CONVERTED'].includes(quote.status)) {
            throw new Error('Cannot revise a converted quote');
        }

        const items = updates.items || (quote.items as any[]) || [];
        const discountAmount = updates.discountAmount !== undefined ? updates.discountAmount : Number(quote.discountAmount || 0);
        
        const subtotal = items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);
        const freightAmount = Number(quote.freightAmount || 0);

        if (discountAmount < 0) {
            throw new Error('Discount cannot be negative');
        }

        if (discountAmount > (subtotal + freightAmount)) {
            throw new Error('Discount cannot exceed total quote value');
        }

        const totalAmount = (subtotal + freightAmount) - discountAmount;

        await db.update(simulations).set({
            items: items.length > 0 ? items : null,
            subtotal: String(subtotal),
            discountAmount: String(discountAmount),
            totalAmount: String(totalAmount),
            expiresAt: updates.expiresAt !== undefined ? updates.expiresAt : quote.expiresAt,
            revisionCount: (quote.revisionCount || 0) + 1,
            // Revert status to DRAFT if explicitly revised (maybe they need to send again)
            status: 'DRAFT',
            updatedAt: new Date()
        }).where(and(eq(simulations.tenantId, tenantId), eq(simulations.id, quoteId)));

        void domineIntakeService.publish({
            tenantId,
            type: 'QUOTE_REVISED',
            source: 'cockpit',
            payload: {
                quoteId,
                conversationId: quote.conversationId,
                discountAmount,
            }
        }).catch(e => logger.warn('Failed to emit QUOTE_REVISED', { error: e.message }));

        // Sync change to CRM
        await crmService.syncSimulationToQuote({
            tenantId,
            customerId: quote.customerId ?? undefined,
            conversationId: quote.conversationId ?? undefined,
            quoteId,
            status: 'DRAFT',
            subtotal: String(subtotal),
            freightAmount: String(freightAmount),
            totalAmount: String(totalAmount),
            discountAmount: String(discountAmount),
            expiresAt: updates.expiresAt !== undefined ? updates.expiresAt : quote.expiresAt,
            items: items.map((i: any) => ({
                description: i.name || 'Produto',
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                totalPrice: i.unitPrice * i.quantity
            }))
        });

        return await this.getQuoteById(tenantId, quoteId);
    }

    async sendQuote(tenantId: string, quoteId: string) {
        const db = await getDb();
        const quote = await this.getQuoteById(tenantId, quoteId);
        if (!quote) throw new Error('Quote not found');
        
        await db.update(simulations).set({
            status: 'SENT',
            sentAt: new Date(),
            updatedAt: new Date()
        }).where(and(eq(simulations.tenantId, tenantId), eq(simulations.id, quoteId)));

        // Sync CRM Quote & Opportunity to 'sent'/'proposal_sent' (best-effort, non-blocking for the main flow)
        try {
            const crmQuoteResult = await db.select().from(crmQuotes).where(withTenantIdNotDeleted(crmQuotes, tenantId, quoteId)).limit(1);
            if (crmQuoteResult[0] && crmQuoteResult[0].opportunityId) {
                await db.update(crmQuotes).set({ status: 'sent', updatedAt: new Date() }).where(withTenantIdNotDeleted(crmQuotes, tenantId, quoteId));
                await db.update(crmOpportunities)
                    .set({ stage: 'proposal_sent', lastActivityAt: new Date() })
                    .where(withTenantIdNotDeleted(crmOpportunities, tenantId, crmQuoteResult[0].opportunityId));
            }
        } catch (error) {
            logger.error(
                `Failed to sync CRM quote/opportunity to sent status after sending quote [tenant: ${tenantId}, quote: ${quoteId}]`,
                error as Error
            );
        }

        // Emit operational event
        await publishOperationalEvent({
            tenantId,
            eventType: 'quote_sent',
            eventDomain: 'CONVERSION',
            customerId: quote.customerId || undefined,
            payload: { quoteId, conversationId: quote.conversationId }
        });

        return true;
    }

    async acceptQuote(tenantId: string, quoteId: string) {
        const db = await getDb();
        const quote = await this.getQuoteById(tenantId, quoteId);
        if (!quote) throw new Error('Quote not found');
        
        // Prevent manual accept on Converted/Expired
        if (['CONVERTED', 'EXPIRED'].includes(quote.status)) {
            throw new Error(`Cannot manually accept quote in ${quote.status} status`);
        }
        
        await db.update(simulations).set({
            status: 'ACCEPTED',
            updatedAt: new Date()
        }).where(and(eq(simulations.tenantId, tenantId), eq(simulations.id, quoteId)));

        // Sync CRM Quote to 'accepted' and opportunity to 'awaiting_response' (non-blocking)
        try {
            const crmQuoteResult = await db.select().from(crmQuotes).where(withTenantIdNotDeleted(crmQuotes, tenantId, quoteId)).limit(1);
            if (crmQuoteResult[0] && crmQuoteResult[0].opportunityId) {
                await db.update(crmQuotes).set({ status: 'accepted', updatedAt: new Date() }).where(withTenantIdNotDeleted(crmQuotes, tenantId, quoteId));
                await db.update(crmOpportunities)
                    .set({ stage: 'awaiting_response', lastActivityAt: new Date() })
                    .where(withTenantIdNotDeleted(crmOpportunities, tenantId, crmQuoteResult[0].opportunityId));
            }
        } catch (error) {
            logger.error(
                `Failed to sync CRM quote/opportunity status to accepted on quote acceptance [tenant: ${tenantId}, quote: ${quoteId}]`,
                error as Error
            );
        }

        // Emit operational event
        await publishOperationalEvent({
            tenantId,
            eventType: 'quote_accepted',
            eventDomain: 'CONVERSION',
            customerId: quote.customerId || undefined,
            payload: { quoteId, conversationId: quote.conversationId }
        });

        return true;
    }
}

export const freightQuoteService = new FreightQuoteService();
