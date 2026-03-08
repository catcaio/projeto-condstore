import { appConfig } from '../../config/app.config';
import { logger } from '../../infra/logger';
import { melhorEnvioProvider } from '../../providers/melhorenvio.provider';
import { freightTableProvider } from '../../infra/freight-table';
import { FreightRequest, FreightOption, FreightStrategy } from './freight.types';
import { CarrierAdapter, QuoteInput, NormalizedQuote } from '../shipping/carriers/types';
import { ConcurrentQuoteEngine } from '../shipping/quote-engine/ConcurrentQuoteEngine';
import { getTableAdaptersForDestination } from './table-driven-adapter';

export class MelhorEnvioAdapter implements CarrierAdapter {
    id = 'melhorenvio';
    name = 'Melhor Envio';

    async getQuotes(input: QuoteInput): Promise<NormalizedQuote[]> {
        const meQuotes = await melhorEnvioProvider.calculateShipping({
            tenantId: 'system',
            destinationCep: input.destinationCep,
            totalWeight: input.weightInKg,
            quantity: 1,
            dimensions: {
                width: input.widthCm || 0,
                height: input.heightCm || 0,
                length: input.lengthCm || 0
            }
        });
        return meQuotes.map(q => ({
            carrierCode: this.id,
            serviceCode: q.service,
            serviceName: q.service,
            price: q.price,
            estimatedDeliveryDays: q.deliveryTime,
            trackingProvided: true,
            priorityScore: 0
        }));
    }

    async checkHealth() {
        return { status: 'healthy' as const, latencyMs: 0, lastCheckedAt: new Date() };
    }
}

/** Legacy CSV-based adapter (kept as fallback) */
export class TabelaAdapter implements CarrierAdapter {
    id = 'tabela';
    name = 'Transportadora Econômica';

    async getQuotes(input: QuoteInput): Promise<NormalizedQuote[]> {
        const quote = await freightTableProvider.getFreightByCep(input.destinationCep, input.weightInKg);
        if (!quote) return [];
        return [{
            carrierCode: this.id,
            serviceCode: 'standard',
            serviceName: 'Standard',
            price: quote.valor,
            estimatedDeliveryDays: quote.prazo,
            trackingProvided: false,
            priorityScore: 0
        }];
    }

    async checkHealth() {
        return { status: 'healthy' as const, latencyMs: 0, lastCheckedAt: new Date() };
    }
}

import { selectCarrierStrategy, type RoutingResult, type RoutingStrategy } from './carrier-router';

export class UnifiedQuoteEngine {
    private melhorEnvio = new MelhorEnvioAdapter();
    private tabelaLegacy = new TabelaAdapter();

    /** Last routing result — accessible after getQuotes() */
    public lastRoutingResult: RoutingResult | null = null;

    private decideStrategy(totalWeight: number): FreightStrategy {
        if (totalWeight <= 10) return FreightStrategy.MELHORENVIO_ONLY;
        if (totalWeight > 10 && totalWeight <= 15) return FreightStrategy.BOTH;
        return FreightStrategy.TABELA_ONLY;
    }

    async getQuotes(request: FreightRequest): Promise<FreightOption[]> {
        const unitWeight = request.unitWeight || appConfig.freight.defaultUnitWeight;
        const totalWeight = unitWeight * request.quantity;

        // ─── Carrier Router ─────────────────────────────────────────
        const longestDim = Math.max(
            request.dimensions?.width ?? 0,
            request.dimensions?.height ?? 0,
            request.dimensions?.length ?? 0,
        );

        const routingResult = selectCarrierStrategy({
            tenantId: request.tenantId || 'LOJACOND',
            originCep: '88131640', // default, overridden by operational settings upstream
            destinationCep: request.destinationCep || request.cepDestino || '',
            totalWeight,
            cubedWeight: totalWeight, // simplified — real cubed weight calculated downstream
            chargedWeight: totalWeight,
            volumes: 1,
            longestDimensionCm: longestDim,
            zoneCode: request.zoneCode,
        });

        this.lastRoutingResult = routingResult;

        // Use legacy strategy as fallback mapping
        const strategy = this.decideStrategy(totalWeight);

        const adapters: CarrierAdapter[] = [];

        // Route based on carrier router strategy
        if (routingResult.strategy === 'melhor_envio' || strategy === FreightStrategy.MELHORENVIO_ONLY || strategy === FreightStrategy.BOTH) {
            adapters.push(this.melhorEnvio);
        }

        // Table-driven carriers: try DB-backed adapters first
        if (routingResult.strategy === 'table_carriers' || strategy === FreightStrategy.TABELA_ONLY || strategy === FreightStrategy.BOTH) {
            const tenantId = request.tenantId || 'LOJACOND';
            try {
                const tableAdapters = await getTableAdaptersForDestination(tenantId, request.destinationCep);
                if (tableAdapters.length > 0) {
                    adapters.push(...tableAdapters);
                    logger.info('quote_engine: using table-driven adapters', {
                        carriers: tableAdapters.map(a => a.name),
                        destination: request.destinationCep,
                        routerStrategy: routingResult.strategy,
                    });
                } else {
                    // Fallback to legacy CSV adapter
                    adapters.push(this.tabelaLegacy);
                    logger.info('quote_engine: no table-driven carriers, using legacy CSV');
                }
            } catch (err) {
                // Fallback to legacy on error
                adapters.push(this.tabelaLegacy);
                logger.warn('quote_engine: table-driven lookup failed, falling back to CSV', {
                    error: (err as Error).message,
                });
            }
        }

        // Braspress API strategy — for now uses table carriers as placeholder
        if (routingResult.strategy === 'braspress_api' && adapters.length === 0) {
            const tenantId = request.tenantId || 'LOJACOND';
            try {
                const tableAdapters = await getTableAdaptersForDestination(tenantId, request.destinationCep);
                if (tableAdapters.length > 0) {
                    adapters.push(...tableAdapters);
                } else {
                    adapters.push(this.tabelaLegacy);
                }
            } catch {
                adapters.push(this.tabelaLegacy);
            }
            logger.info('quote_engine: braspress_api strategy — using available adapters as bridge', {
                destination: request.destinationCep,
            });
        }

        const quoteInput: QuoteInput = {
            originCep: '', // Not used by the downstream adapters in this context
            destinationCep: request.destinationCep,
            weightInKg: totalWeight,
            widthCm: request.dimensions?.width,
            heightCm: request.dimensions?.height,
            lengthCm: request.dimensions?.length,
            packageType: 'box'
        };

        const result = await ConcurrentQuoteEngine.run({
            tenantId: request.tenantId || 'system',
            intentId: request.requestId || 'unknown',
            input: quoteInput,
            adapters,
            timeoutMs: 8000
        });

        return result.quotes.map(q => ({
            id: `${q.carrierCode}-${q.serviceCode}`,
            carrier: q.carrierCode,
            service: q.serviceName,
            price: q.price,
            deliveryTime: q.estimatedDeliveryDays,
            source: q.carrierCode
        }));
    }
}

export const unifiedQuoteEngine = new UnifiedQuoteEngine();
