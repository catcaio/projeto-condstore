import { getDb } from '@/infra/db';
import { simulations } from '@/drizzle/schema';
import { freightService } from '../freight/freight.service';
import { domineIntakeService } from '@/domine/domine-intake.service';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '@/infra/logger';
import crypto from 'crypto';

export interface CreateFreightQuoteInput {
    tenantId: string;
    conversationId: string;
    customerId?: string;
    operatorId: string;
    cep: string;
    weight: number;
    quantity: number;
    dimensions?: { width: number; height: number; length: number };
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
            event: 'QUOTE_COMPLETED'
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
                carrier: bestOption?.carrier
            }
        }).catch(e => logger.warn('Failed to emit QUOTE_SIMULATED', { error: e.message }));

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
}

export const freightQuoteService = new FreightQuoteService();
