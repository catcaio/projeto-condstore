import { eq, and, sql, count } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import { conversations, simulations } from '@/drizzle/schema';

export interface PipelineMetrics {
    totalLeads: number;
    conversionRate: number; // percentage (0-100)
    avgQuoteValue: number;
    totalQuotesSent: number;
    opportunitiesLost: number;
    dealsWon: number;
}

export const pipelineMetricsService = {
    async getMetrics(tenantId: string): Promise<PipelineMetrics> {
        const db = await getDb();

        // Total leads = any conversation
        const [leadsCount] = await db.select({ count: count() })
            .from(conversations)
            .where(eq(conversations.tenantId, tenantId));
        const totalLeads = leadsCount?.count || 0;

        // Deals won & lost
        const [wonCount] = await db.select({ count: count() })
            .from(conversations)
            .where(and(eq(conversations.tenantId, tenantId), eq(conversations.stage, 'WON')));
        const dealsWon = wonCount?.count || 0;

        const [lostCount] = await db.select({ count: count() })
            .from(conversations)
            .where(and(eq(conversations.tenantId, tenantId), eq(conversations.stage, 'LOST')));
        const opportunitiesLost = lostCount?.count || 0;

        // Conversion Rate (deals won / total leads)
        // If totalLeads is 0, conversion is 0.
        const conversionRate = totalLeads > 0 
            ? Number(((dealsWon / totalLeads) * 100).toFixed(2)) 
            : 0;

        // Total Quotes Sent = count of simulations initiated via Atendimento for this tenant
        // A better approach would be to look at QUOTE_SENT events, but we can proxy by source ATENDIMENTO 
        // OR count the distinct conversation IDs that have a simulation
        const [quotesCount] = await db.select({ count: count() })
            .from(simulations)
            .where(and(eq(simulations.tenantId, tenantId), eq(simulations.source, 'ATENDIMENTO')));
        const totalQuotesSent = quotesCount?.count || 0;

        // Average Quote Value 
        const [avgQuoteData] = await db.select({
                avgVal: sql`AVG(selling_price)`.mapWith(Number)
            })
            .from(simulations)
            .where(and(
                eq(simulations.tenantId, tenantId), 
                eq(simulations.source, 'ATENDIMENTO'),
                sql`selling_price IS NOT NULL`
            ));
        const avgQuoteValue = Number((avgQuoteData?.avgVal || 0).toFixed(2));

        return {
            totalLeads,
            conversionRate,
            avgQuoteValue,
            totalQuotesSent,
            opportunitiesLost,
            dealsWon
        };
    }
};
