/**
 * Freight Service.
 * Implements business logic for freight calculation.
 * Orchestrates providers based on weight-based decision rules.
 */

import { appConfig } from '../../config/app.config';
import { BusinessError, ErrorCode } from '../../infra/errors';
import { logger } from '../../infra/logger';
import type {
  FreightOption,
  FreightRequest,
  FreightResult,
  FreightStrategy,
  WeightDecision,
} from './freight.types';
import { unifiedQuoteEngine } from './quoting/quote-engine';
import { redisClient } from '../../infra/redis.client';
import { freightSimulationLogRepository } from '../../infra/repositories/freight-simulation-log.repository';
import { domineIntakeService } from '../../domine/domine-intake.service';
import { resolvePackingDimensions } from './quoting/packing-resolver';



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

      // Resolve packing dimensions from profile or fallback
      const resolved = await resolvePackingDimensions({
        tenantId: request.tenantId,
        productRef: request.productRef,
        quantity: request.quantity,
        dimensions: request.dimensions,
        unitWeight: request.unitWeight,
        defaultUnitWeight: appConfig.freight.defaultUnitWeight,
        manualOverride: request.manualVolumes && request.manualWeight
          ? { volumes: request.manualVolumes, totalWeight: request.manualWeight }
          : undefined,
      });

      // Enrich request with resolved dimensions
      const enrichedRequest: FreightRequest = {
        ...request,
        unitWeight: resolved.unitWeight,
        dimensions: (resolved.width > 0 && resolved.height > 0 && resolved.length > 0)
          ? { width: resolved.width, height: resolved.height, length: resolved.length }
          : request.dimensions,
      };

      // Calculate total weight from resolver
      const totalWeight = resolved.totalWeight;
      const correlationId = request.requestId || `quote_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      if (request.tenantId) {
        void domineIntakeService.publish({
          tenantId: request.tenantId,
          type: 'FREIGHT_QUOTE_REQUESTED',
          source: 'connector',
          payload: {
            correlationId,
            requestId: request.requestId,
            destinationZip: request.destinationCep,
            weight: totalWeight,
            dims: request.dimensions ? `${request.dimensions.width}x${request.dimensions.height}x${request.dimensions.length}` : null
          }
        }).catch(e => logger.warn('domine_publish_req_fail', { error: e.message }));
      }

      logger.info('Calculating freight', {
        destinationCep: request.destinationCep,
        quantity: request.quantity,
        totalWeight,
        dimensionSource: resolved.source,
        profileId: resolved.profileId || null,
      });

      // Fetch quotes using unified quote engine with enriched request
      let options = await unifiedQuoteEngine.getQuotes(enrichedRequest);

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
          attribution: request.attribution ?? null,
          requestId: request.requestId,
        });

        // Publish to Domine (fire and forget)
        void domineIntakeService.publish({
          tenantId: request.tenantId,
          type: 'FREIGHT_QUOTE_COMPLETED',
          source: 'connector',
          payload: {
            correlationId,
            bestCarrier: bestOption.carrier || bestOption.id?.split('-')[0] || 'unknown',
            bestPriceCents: Math.round(bestOption.price * 100),
            bestEtaDays: bestOption.deliveryTime,
            quotesJsonRedacted: sortedOptions.map(o => ({
              carrier: o.carrier || o.id?.split('-')[0],
              service: o.service,
              price: o.price,
              eta: o.deliveryTime
            }))
          }
        }).catch(e => logger.warn('domine_publish_comp_fail', { error: e.message }));
      }

      // Cache the result
      await this.cacheResult(request, totalWeight, options);

      return {
        success: true,
        options: sortedOptions,
        totalWeight,
        request,
        calculatedAt: new Date(),
        dimensionSource: resolved.source,
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
    const tenantKey = request.tenantId || 'global';
    const key = `v1:freight:${tenantKey}:${request.destinationCep.replace(/\D/g, '')}:${totalWeight}:${request.quantity}`;
    const cacheSafeRequest: FreightRequest = {
      ...request,
      attribution: null,
      requestId: undefined,
    };
    const result: FreightResult = {
      success: true,
      options: this.sortAndLimitOptions(options),
      totalWeight,
      request: cacheSafeRequest,
      calculatedAt: new Date(),
    };

    await redisClient.set(key, result, 600); // 10 minutes TTL
  }

  /**
   * Simulate freight specifically for orchestrator.
   */
  async simulateFreight(params: {
    tenantId: string;
    productId: string;
    quantity: number;
    destinationZip: string;
  }): Promise<{ carrier: string; price: number; deliveryDays: number }> {
    const { catalogService } = await import('../catalog/catalog.service');
    const [product] = await catalogService.searchProductsByName(params.tenantId, params.productId);

    if (!product) {
      throw new BusinessError(
        ErrorCode.FREIGHT_CALCULATION_ERROR,
        'Product not found for simulation',
        params
      );
    }

    const quote = await this.simulateFreightQuote({
      tenantId: params.tenantId,
      productId: product.productId,
      quantity: params.quantity,
      destinationZip: params.destinationZip,
      unitWeight: product.weight,
    });

    return {
      carrier: quote.carrier,
      price: quote.freightPrice,
      deliveryDays: quote.estimatedDays
    };
  }

  async simulateFreightQuote(input: {
    productId: string;
    quantity: number;
    destinationZip: string;
    tenantId?: string;
    unitWeight?: number;
  }): Promise<{ freightPrice: number; estimatedDays: number; carrier: string }> {
    if (!input.productId || !input.quantity || !input.destinationZip) {
      throw new BusinessError(
        ErrorCode.VALIDATION_ERROR,
        'Missing required parameters for freight simulation',
        { input },
      );
    }

    const result = await this.calculateFreight({
      tenantId: input.tenantId,
      productRef: input.productId,
      quantity: input.quantity,
      destinationCep: input.destinationZip.replace(/\D/g, ''),
      unitWeight: input.unitWeight,
    });

    const best = result.options[0];
    return {
      freightPrice: best?.price ?? 0,
      estimatedDays: best?.deliveryTime ?? 0,
      carrier: best?.carrier ?? 'indisponivel',
    };
  }
}

// Export singleton instance
export const freightService = new FreightService();

