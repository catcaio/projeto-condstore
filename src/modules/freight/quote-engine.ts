import { appConfig } from '../../config/app.config';
import { logger } from '../../infra/logger';
import { melhorEnvioProvider } from '../../providers/melhorenvio.provider';
import { freightTableProvider } from '../../infra/freight-table';
import { FreightRequest, FreightOption, FreightStrategy } from './freight.types';
import { CarrierAdapter, QuoteInput, NormalizedQuote } from '../shipping/carriers/types';
import { ConcurrentQuoteEngine } from '../shipping/quote-engine/ConcurrentQuoteEngine';
import { getTableAdaptersForDestination } from './table-driven-adapter';
import { loadOperationalSettings } from '../../core/freight/operational-settings';
import { BusinessError, ErrorCode } from '../../infra/errors';

export class MelhorEnvioAdapter implements CarrierAdapter {
    id = 'melhorenvio';
    name = 'Melhor Envio';
    private tenantId: string;

    constructor(tenantId: string) {
        this.tenantId = tenantId;
    }

    async getQuotes(input: QuoteInput): Promise<NormalizedQuote[]> {
        const meQuotes = await melhorEnvioProvider.calculateShipping({
            tenantId: this.tenantId,
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
    private tabelaLegacy = new TabelaAdapter();

    /** Last routing result — accessible after getQuotes() */
    public lastRoutingResult: RoutingResult | null = null;

    private decideStrategy(totalWeight: number): FreightStrategy {
        if (totalWeight <= 10) return FreightStrategy.MELHORENVIO_ONLY;
        if (totalWeight > 10 && totalWeight <= 15) return FreightStrategy.BOTH;
        return FreightStrategy.TABELA_ONLY;
    }

    async getQuotes(request: FreightRequest): Promise<FreightOption[]> {
        if (!request.tenantId || typeof request.tenantId !== 'string' || request.tenantId.trim() === '') {
            throw new BusinessError(ErrorCode.VALIDATION_ERROR, 'tenantId is required and must be a valid string');
        }

        const unitWeight = request.unitWeight || appConfig.freight.defaultUnitWeight;
        const totalWeight = unitWeight * request.quantity;

        // ─── Carrier Router ─────────────────────────────────────────
        const longestDim = Math.max(
            request.dimensions?.width ?? 0,
            request.dimensions?.height ?? 0,
            request.dimensions?.length ?? 0,
        );

        const settings = await loadOperationalSettings(request.tenantId);
        const originCep = settings.defaultOriginCep?.trim();
        if (!originCep) {
            throw new BusinessError(
                ErrorCode.VALIDATION_ERROR,
                `originCep is required for tenant ${request.tenantId}`,
            );
        }

        const routingResult = selectCarrierStrategy({
            tenantId: request.tenantId,
            originCep,
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
            adapters.push(new MelhorEnvioAdapter(request.tenantId));
        }

        // Table-driven carriers: ALWAYS try DB-backed adapters as complement
        const tenantId = request.tenantId;
        try {
            const tableAdapters = await getTableAdaptersForDestination(tenantId, request.destinationCep);
            if (tableAdapters.length > 0) {
                adapters.push(...tableAdapters);
                logger.info('quote_engine: using table-driven adapters', {
                    carriers: tableAdapters.map(a => a.name),
                    destination: request.destinationCep,
                    routerStrategy: routingResult.strategy,
                });
            } else if (routingResult.strategy !== 'melhor_envio') {
                // Only fallback to legacy CSV if ME is not the primary strategy
                adapters.push(this.tabelaLegacy);
                logger.info('quote_engine: no table-driven carriers, using legacy CSV');
            }
        } catch (err) {
            if (routingResult.strategy !== 'melhor_envio') {
                adapters.push(this.tabelaLegacy);
            }
            logger.warn('quote_engine: table-driven lookup failed, falling back', {
                error: (err as Error).message,
            });
        }

        const quoteInput: QuoteInput = {
            originCep,
            destinationCep: request.destinationCep,
            weightInKg: totalWeight,
            widthCm: request.dimensions?.width,
            heightCm: request.dimensions?.height,
            lengthCm: request.dimensions?.length,
            packageType: 'box'
        };

        const result = await ConcurrentQuoteEngine.run({
            tenantId: request.tenantId,
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
