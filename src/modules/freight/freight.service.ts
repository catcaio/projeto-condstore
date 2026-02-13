/**
 * Freight Service.
 * Implements business logic for freight calculation.
 * Orchestrates providers based on weight-based decision rules.
 */

import { appConfig } from '../../config/app.config';
import { BusinessError, ErrorCode } from '../../infra/errors';
import { logger } from '../../infra/logger';
import { melhorEnvioProvider } from '../../providers/melhorenvio.provider';
import type {
  FreightOption,
  FreightRequest,
  FreightResult,
  FreightStrategy,
  WeightDecision,
} from './freight.types';
import { redisClient } from '../../infra/redis.client';
import { simulationRepository } from '../../infra/repositories/simulation.repository';
import { randomUUID } from 'crypto';

// Import tabela provider (we'll need to create this)
interface TabelaQuote {
  id: string;
  carrier: string;
  service: string;
  price: number;
  deliveryTime: number;
}

/**
 * Simple tabela provider (placeholder for now).
 * In production, this would fetch from CSV or database.
 */
class TabelaProvider {
  async calculateShipping(totalWeight: number): Promise<TabelaQuote[]> {
    // Mock implementation - replace with actual CSV fetch
    logger.debug('Calculating shipping from tabela', { totalWeight });

    // Simulate tabela quotes
    const quotes: TabelaQuote[] = [];

    if (totalWeight <= 30) {
      quotes.push({
        id: 'tabela-1',
        carrier: 'Transportadora Local',
        service: 'Rodoviário',
        price: 45.0 + totalWeight * 2.5,
        deliveryTime: 5,
      });
    }

    return quotes;
  }
}

const tabelaProvider = new TabelaProvider();

class FreightService {
  /**
   * Calculate freight options based on request.
   */
  async calculateFreight(request: FreightRequest): Promise<FreightResult> {
    try {
      // Validate request
      this.validateRequest(request);

      // Check cache first
      const cached = await this.getCachedResult(request);
      if (cached) {
        return cached;
      }

      // Calculate total weight
      const unitWeight = request.unitWeight || appConfig.freight.defaultUnitWeight;
      const totalWeight = unitWeight * request.quantity;

      logger.info('Calculating freight', {
        destinationCep: request.destinationCep,
        quantity: request.quantity,
        totalWeight,
      });

      // Determine strategy based on weight
      const decision = this.decideStrategy(totalWeight);

      logger.debug('Freight strategy determined', {
        strategy: decision.strategy,
        reason: decision.reason,
      });

      // Fetch quotes based on strategy
      const options = await this.fetchQuotes(request, totalWeight, decision.strategy);

      // Sort and limit options
      const sortedOptions = this.sortAndLimitOptions(options);
      const bestOption = sortedOptions[0];

      // Calculate margin (placeholder logic for now, as requested to be added in previous turns but we are focusing on persistence here)
      // Assuming naive margin calculation if not present.
      const bestMargin = bestOption.price * 0.2; // Example: 20% margin

      logger.info('Freight calculation completed', {
        optionsCount: sortedOptions.length,
        totalWeight,
      });

      // Persist simulation (awaited with error propagation)
      await this.persistSimulation({
        cep: request.destinationCep,
        weight: totalWeight,
        quantity: request.quantity,
        bestCarrier: bestOption.carrier,
        bestService: bestOption.service,
        bestPrice: bestOption.price,
        bestMargin: bestMargin,
        strategy: decision.strategy,
      });

      // Cache the result
      await this.cacheResult(request, totalWeight, options);

      return {
        success: true,
        options: sortedOptions,
        totalWeight,
        request,
        calculatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Freight calculation failed', error as Error, {
        destinationCep: request.destinationCep,
        quantity: request.quantity,
      });

      if (error instanceof BusinessError) {
        throw error;
      }

      throw new BusinessError(
        ErrorCode.FREIGHT_CALCULATION_ERROR,
        'Failed to calculate freight',
        { request }
      );
    }
  }

  /**
   * Validate freight request.
   */
  private validateRequest(request: FreightRequest): void {
    // Validate CEP
    const cepRegex = /^\d{8}$/;
    if (!cepRegex.test(request.destinationCep)) {
      throw new BusinessError(
        ErrorCode.INVALID_CEP,
        'Invalid CEP format',
        { cep: request.destinationCep }
      );
    }

    // Validate quantity
    if (request.quantity <= 0 || request.quantity > 9999) {
      throw new BusinessError(
        ErrorCode.INVALID_QUANTITY,
        'Invalid quantity',
        { quantity: request.quantity }
      );
    }
  }

  /**
   * Decide freight strategy based on total weight.
   */
  private decideStrategy(totalWeight: number): WeightDecision {
    if (totalWeight <= 10) {
      return {
        totalWeight,
        strategy: 'MELHORENVIO_ONLY' as FreightStrategy,
        reason: 'Weight ≤10kg: Using Melhor Envio only',
      };
    }

    if (totalWeight > 10 && totalWeight <= 15) {
      return {
        totalWeight,
        strategy: 'BOTH' as FreightStrategy,
        reason: 'Weight 10-15kg: Using both Melhor Envio and Tabela',
      };
    }

    return {
      totalWeight,
      strategy: 'TABELA_ONLY' as FreightStrategy,
      reason: 'Weight >15kg: Using Tabela only',
    };
  }

  /**
   * Fetch quotes from providers based on strategy.
   */
  private async fetchQuotes(
    request: FreightRequest,
    totalWeight: number,
    strategy: FreightStrategy
  ): Promise<FreightOption[]> {
    const options: FreightOption[] = [];

    try {
      // Fetch from Melhor Envio
      if (strategy === 'MELHORENVIO_ONLY' || strategy === 'BOTH') {
        const meQuotes = await melhorEnvioProvider.calculateShipping({
          destinationCep: request.destinationCep,
          totalWeight,
          quantity: request.quantity,
          dimensions: request.dimensions,
        });

        options.push(...meQuotes);
      }

      // Fetch from Tabela
      if (strategy === 'TABELA_ONLY' || strategy === 'BOTH') {
        const tabelaQuotes = await tabelaProvider.calculateShipping(totalWeight);

        options.push(
          ...tabelaQuotes.map((q) => ({
            ...q,
            source: 'tabela' as const,
          }))
        );
      }

      if (options.length === 0) {
        throw new BusinessError(
          ErrorCode.NO_FREIGHT_OPTIONS,
          'No freight options available for this destination',
          { destinationCep: request.destinationCep, totalWeight }
        );
      }

      return options;
    } catch (error) {
      if (error instanceof BusinessError) {
        throw error;
      }

      logger.error('Failed to fetch quotes from providers', error as Error, {
        strategy,
        totalWeight,
      });

      throw new BusinessError(
        ErrorCode.FREIGHT_CALCULATION_ERROR,
        'Failed to fetch freight quotes',
        { strategy, totalWeight }
      );
    }
  }

  /**
   * Sort options by price (ascending) and delivery time (ascending).
   * Limit to max options configured.
   */
  private sortAndLimitOptions(options: FreightOption[]): FreightOption[] {
    return options
      .sort((a, b) => {
        // Sort by price first
        if (a.price !== b.price) {
          return a.price - b.price;
        }
        // Then by delivery time
        return a.deliveryTime - b.deliveryTime;
      })
      .slice(0, appConfig.freight.maxOptionsToReturn);
  }

  /**
   * Format freight options for user display.
   */
  formatOptionsForUser(options: FreightOption[]): string {
    if (options.length === 0) {
      return 'Desculpe, não conseguimos calcular o frete para esse CEP.';
    }

    const lines = options.map(
      (opt, index) =>
        `${index + 1}. ${opt.carrier} - R$ ${opt.price.toFixed(2)} - Prazo: ${opt.deliveryTime} dias`
    );

    return `Aqui estão as melhores opções de frete:\n\n${lines.join('\n')}`;
  }

  /**
   * Get cached result if available.
   */
  private async getCachedResult(request: FreightRequest): Promise<FreightResult | null> {
    const unitWeight = request.unitWeight || appConfig.freight.defaultUnitWeight;
    const totalWeight = unitWeight * request.quantity;
    const key = `v1:freight:${request.destinationCep}:${totalWeight}:${request.quantity}`;

    const cached = await redisClient.get<FreightResult>(key);

    if (cached) {
      logger.info('Freight cache hit', { key });
      return {
        ...cached,
        calculatedAt: new Date(cached.calculatedAt), // Restore Date object
      };
    }

    logger.debug('Freight cache miss', { key });
    return null;
  }

  /**
   * Cache the calculation result.
   */
  private async cacheResult(
    request: FreightRequest,
    totalWeight: number,
    options: FreightOption[]
  ): Promise<void> {
    const key = `v1:freight:${request.destinationCep}:${totalWeight}:${request.quantity}`;
    const result: FreightResult = {
      success: true,
      options: this.sortAndLimitOptions(options),
      totalWeight,
      request,
      calculatedAt: new Date(),
    };

    await redisClient.set(key, result, 600); // 10 minutes TTL
  }

  /**
   * Persist simulation to database.
   */
  private async persistSimulation(data: {
    cep: string;
    weight: number;
    quantity: number;
    bestCarrier: string;
    bestService: string;
    bestPrice: number;
    bestMargin: number;
    strategy: string;
  }): Promise<void> {
    try {
      await simulationRepository.saveSimulation({
        id: randomUUID(),
        cep: data.cep,
        weight: data.weight.toString(),
        quantity: data.quantity,
        bestCarrier: data.bestCarrier,
        bestService: data.bestService,
        bestPrice: data.bestPrice.toString(),
        bestMargin: data.bestMargin.toString(),
        strategy: data.strategy,
        productCost: '0.00',
        sellingPrice: '0.00',
      });
    } catch (err) {
      logger.error('Failed to persist simulation', err as Error, { cep: data.cep });
      throw new BusinessError(
        ErrorCode.FREIGHT_CALCULATION_ERROR,
        'Failed to persist simulation result',
        { cep: data.cep }
      );
    }
  }
}

// Export singleton instance
export const freightService = new FreightService();
