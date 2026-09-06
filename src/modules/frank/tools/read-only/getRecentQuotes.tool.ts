import { z } from 'zod';
import { getRecentOrdersForCustomer } from '@/modules/pedidos/server';
import { getQuoteContext } from '@/modules/freight/server';
import { executeFrankTool } from '../tool-guard';
import { buildQuoteRouteSummary, clampSupportLimit } from './shared';
import { FrankToolContract } from '../frank-tool.contract';
import { frankToolRegistry } from '../frank-tool.registry';

export interface RecentQuoteSummary {
    simulationId: string;
    routeSummary: string;
    carrierSummary: string | null;
    quotedAt: Date;
    currentQuoteState: string | null;
}

export interface GetRecentQuotesParams {
    tenantId: string;
    customerId: string;
    limit?: number;
}

export const getRecentQuotesInputSchema = z.object({
    tenantId: z.string().min(1, 'tenantId is required'),
    customerId: z.string().min(1, 'customerId is required'),
    limit: z.number().int().positive().optional(),
});

export const getRecentQuotesOutputSchema = z.array(
    z.object({
        simulationId: z.string(),
        routeSummary: z.string(),
        carrierSummary: z.string().nullable(),
        quotedAt: z.any(),
        currentQuoteState: z.string().nullable(),
    })
);

export const getRecentQuotesContract: FrankToolContract<GetRecentQuotesParams, RecentQuoteSummary[]> = {
    name: 'get_recent_quotes',
    description: 'Retrieves recent quotes and simulation history for a given customer.',
    inputSchema: getRecentQuotesInputSchema,
    outputSchema: getRecentQuotesOutputSchema,
    isReadOnly: true,
    riskClass: 'SAFE',
    capabilities: ['READ', 'QUERY'],
    sideEffects: ['NONE'],
    execute: async (input) => {
        return getRecentQuotesTool(input);
    },
};

frankToolRegistry.registerTool(getRecentQuotesContract);

export async function getRecentQuotesTool(
    params: GetRecentQuotesParams,
): Promise<RecentQuoteSummary[]> {
    return executeFrankTool({
        tenantId: params.tenantId,
        toolName: 'get_recent_quotes',
        access: 'read_only',
        run: async () => {
            const limit = clampSupportLimit(params.limit);
            const candidateOrders = await getRecentOrdersForCustomer(
                params.tenantId,
                params.customerId,
                Math.max(limit * 3, 10),
            );

            const dedupe = new Set<string>();
            const quotes: RecentQuoteSummary[] = [];

            for (const order of candidateOrders) {
                const simulationId = order.freightSimulationId ?? undefined;
                const confirmationId = order.freightConfirmationId ?? undefined;

                if (!simulationId && !confirmationId) {
                    continue;
                }

                const quoteKey = `${simulationId ?? 'none'}:${confirmationId ?? 'none'}`;
                if (dedupe.has(quoteKey)) {
                    continue;
                }

                const quoteContext = await getQuoteContext(
                    params.tenantId,
                    simulationId,
                    confirmationId,
                );

                const resolvedSimulationId =
                    quoteContext.simulation?.id ??
                    quoteContext.confirmation?.simulationId ??
                    simulationId;

                if (!resolvedSimulationId) {
                    continue;
                }

                dedupe.add(quoteKey);
                quotes.push({
                    simulationId: resolvedSimulationId,
                    routeSummary: buildQuoteRouteSummary({
                        cep: quoteContext.simulation?.cep ?? quoteContext.confirmation?.cep ?? null,
                        zoneCode: quoteContext.simulation?.zoneCode ?? quoteContext.confirmation?.zoneCode ?? null,
                    }),
                    carrierSummary:
                        quoteContext.confirmation?.carrierName ??
                        quoteContext.simulation?.carrierSelected ??
                        null,
                    quotedAt:
                        quoteContext.confirmation?.createdAt ??
                        quoteContext.simulation?.createdAt ??
                        order.createdAt,
                    currentQuoteState:
                        quoteContext.confirmation?.status ??
                        (quoteContext.simulation ? 'SIMULATED' : null),
                });

                if (quotes.length >= limit) {
                    break;
                }
            }

            return quotes
                .sort((left, right) => right.quotedAt.getTime() - left.quotedAt.getTime())
                .slice(0, limit);
        },
    });
}
