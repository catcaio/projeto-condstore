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
import { getRedis() } from '../../infra/redis.client';
import { freightTableProvider } from '../../infra/freight-table';
import { freightSimulationLogRepository } from '../../infra/repositories/freight-simulation-log.repository';



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

      logger.info('Freight calculation completed', {
        optionsCount: sortedOptions.length,
        totalWeight,
      });

      if (request.tenantId && bestOption) {
        void freightSimulationLogRepository.saveMetricInBackground({
          tenantId: request.tenantId,
          destinationCep: request.destinationCep,
          totalWeight,
          bestPrice: bestOption.price,
          bestDeliveryTime: bestOption.deliveryTime,
        });
      }

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
        try {
          const quote = await freightTableProvider.getFreightByCep(request.destinationCep, totalWeight);

          if (quote) {
            options.push({
              id: `tabela-${quote.cep_inicio}-${quote.cep_fim}`,
              carrier: 'Transportadora Econômica',
              service: 'Standard',
              price: quote.valor,
              deliveryTime: quote.prazo,
              source: 'tabela'
            });
          }
        } catch (err) {
          logger.warn('Failed to get table quote', {}, err as Error);
        }
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

    const best = options[0];
    // "Frete R$X, prazo Y dias. Quer fechar?"
    const formattedPrice = best.price.toFixed(2).replace('.', ',');
    return `Frete R$${formattedPrice}, prazo ${best.deliveryTime} dias. Quer fechar?`;
  }

  /**
   * Get cached result if available.
   */
  private async getCachedResult(request: FreightRequest): Promise<FreightResult | null> {
    const unitWeight = request.unitWeight || appConfig.freight.defaultUnitWeight;
    const totalWeight = unitWeight * request.quantity;
    const tenantKey = request.tenantId || 'global';
    const key = `v1:freight:${tenantKey}:${request.destinationCep.replace(/\D/g, '')}:${totalWeight}:${request.quantity}`;

    const cached = await getRedis().get<FreightResult>(key);

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
    const tenantKey = request.tenantId || 'global';
    const key = `v1:freight:${tenantKey}:${request.destinationCep.replace(/\D/g, '')}:${totalWeight}:${request.quantity}`;
    const result: FreightResult = {
      success: true,
      options: this.sortAndLimitOptions(options),
      totalWeight,
      request,
      calculatedAt: new Date(),
    };

    await getRedis().set(key, result, 600); // 10 minutes TTL
  }

}

// Export singleton instance
export const freightService = new FreightService();
