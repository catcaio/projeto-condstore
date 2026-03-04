import { appConfig } from '../../config/app.config';
import { logger } from '../../infra/logger';
import { melhorEnvioProvider } from '../../providers/melhorenvio.provider';
import { freightTableProvider } from '../../infra/freight-table';
import { FreightRequest, FreightOption, FreightStrategy } from './freight.types';
import { CarrierAdapter, QuoteInput, NormalizedQuote } from '../shipping/carriers/types';
import { ConcurrentQuoteEngine } from '../shipping/quote-engine/ConcurrentQuoteEngine';

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

export class UnifiedQuoteEngine {
    private melhorEnvio = new MelhorEnvioAdapter();
    private tabela = new TabelaAdapter();

    private decideStrategy(totalWeight: number): FreightStrategy {
        if (totalWeight <= 10) return FreightStrategy.MELHORENVIO_ONLY;
        if (totalWeight > 10 && totalWeight <= 15) return FreightStrategy.BOTH;
        return FreightStrategy.TABELA_ONLY;
    }

    async getQuotes(request: FreightRequest): Promise<FreightOption[]> {
        const unitWeight = request.unitWeight || appConfig.freight.defaultUnitWeight;
        const totalWeight = unitWeight * request.quantity;
        const strategy = this.decideStrategy(totalWeight);

        const adapters: CarrierAdapter[] = [];
        if (strategy === FreightStrategy.MELHORENVIO_ONLY || strategy === FreightStrategy.BOTH) {
            adapters.push(this.melhorEnvio);
        }
        if (strategy === FreightStrategy.TABELA_ONLY || strategy === FreightStrategy.BOTH) {
            adapters.push(this.tabela);
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
            carrier: q.carrierCode, // Preserving structure
            service: q.serviceName,
            price: q.price,
            deliveryTime: q.estimatedDeliveryDays,
            source: q.carrierCode as 'melhorenvio' | 'tabela'
        }));
    }
}

export const unifiedQuoteEngine = new UnifiedQuoteEngine();
