import { getRecentOrdersForCustomer } from '@/modules/pedidos/server';
import { getQuoteContext } from '@/modules/freight/server';
import { executeFrankTool } from '../tool-guard';
import { buildQuoteRouteSummary, clampSupportLimit } from './shared';

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
