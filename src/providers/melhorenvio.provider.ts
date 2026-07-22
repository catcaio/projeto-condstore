/**
 * Melhor Envio API provider.
 * Handles all Melhor Envio API interactions with retry logic and error handling.
 */

import { melhorEnvioConfig, melhorEnvioEndpoints } from '../config/melhorenvio.config';
import { ErrorCode, ProviderError } from '../infra/errors';
import { logger } from '../infra/logger';
import { circuitBreaker } from '../infra/security/circuit-breaker';
import { structuredLogger } from '../infra/log/logger';
import { secretResolver } from '../infra/security/secret-resolver';

export interface ShippingQuoteRequest {
  tenantId: string;
  originCep: string;
  destinationCep: string;
  totalWeight: number; // kg
  quantity: number;
  dimensions?: {
    width: number; // cm
    height: number; // cm
    length: number; // cm
  };
}

export interface ShippingQuote {
  id: string;
  carrier: string;
  service: string;
  price: number;
  deliveryTime: number; // days
  source: 'melhorenvio';
}

interface MelhorEnvioAPIResponse {
  id: number | string;
  name: string;
  price: number | string;
  custom_price?: number | string;
  delivery_time: number | string;
  error?: string | boolean;
  company?: {
    id: number;
    name: string;
    picture: string;
  };
}

class MelhorEnvioProvider {
  /**
   * Calculate shipping quotes from Melhor Envio API.
   */
  async calculateShipping(request: ShippingQuoteRequest): Promise<ShippingQuote[]> {
    const payload = this.buildPayload(request);

    if (circuitBreaker.isOpen(request.tenantId, 'frete')) {
      structuredLogger.warn('melhorenvio_circuit_open', {
        tenantId: request.tenantId,
        eventType: 'freight_circuit_open'
      });
      return []; // fallback: return no quotes
    }

    try {
      const response = await this.makeRequest<MelhorEnvioAPIResponse[]>(
        request.tenantId,
        melhorEnvioEndpoints.calculateShipping,
        'POST',
        payload
      );

      return this.parseResponse(response);
    } catch (error) {
      logger.error('Failed to calculate shipping via Melhor Envio', error as Error, {
        destinationCep: request.destinationCep,
        totalWeight: request.totalWeight,
      });

      // Re-throw if it's already a ProviderError
      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError(
        ErrorCode.MELHORENVIO_API_ERROR,
        'Failed to calculate shipping',
        { request }
      );
    }
  }

  /**
   * Build API payload from request.
   */
  private buildPayload(request: ShippingQuoteRequest): object {
    const originCep = request.originCep.trim();
    if (!originCep) {
      throw new ProviderError(
        ErrorCode.VALIDATION_ERROR,
        `originCep is required for tenant ${request.tenantId}`,
        { tenantId: request.tenantId },
        false
      );
    }

    const dimensions = request.dimensions || {
      width: 11,
      height: 11,
      length: 11,
    };

    return {
      from: {
        postal_code: originCep,
      },
      to: {
        postal_code: request.destinationCep,
      },
      products: [
        {
          id: 'produto-1',
          width: dimensions.width,
          height: dimensions.height,
          length: dimensions.length,
          weight: request.totalWeight,
          insurance_value: 0,
          quantity: 1, // Total weight already calculated
        },
      ],
      options: {
        receipt: false,
        own_hand: false,
      },
    };
  }

  /**
   * Parse API response into ShippingQuote array.
   */
  private parseResponse(response: MelhorEnvioAPIResponse[]): ShippingQuote[] {
    return response
      .filter((item) => !item.error && item.price && item.delivery_time)
      .map((item) => ({
        id: String(item.id),
        carrier: item.company?.name || item.name.split(' - ')[0] || item.name,
        service: item.name,
        price: parseFloat(String(item.custom_price || item.price)),
        deliveryTime: parseInt(String(item.delivery_time), 10),
        source: 'melhorenvio' as const,
      }));
  }

  /**
   * Make HTTP request to Melhor Envio API with retry logic.
   */
  private async makeRequest<T>(
    tenantId: string,
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: object,
    maxRetries: number = melhorEnvioConfig.maxRetries
  ): Promise<T> {
    const apiUrl = await secretResolver.getValue(
      tenantId,
      'melhorenvio',
      'MELHOR_ENVIO_API_URL',
      'MELHOR_ENVIO_API_URL'
    ).catch(() => melhorEnvioConfig.apiUrl);

    const token = await secretResolver.getValue(
      tenantId,
      'melhorenvio',
      'MELHOR_ENVIO_TOKEN',
      'MELHOR_ENVIO_TOKEN'
    );

    const url = `${apiUrl}${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();

        const response = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'CondStore/1.0',
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(melhorEnvioConfig.timeout),
        });

        const duration = Date.now() - startTime;
        logger.http(method, `melhorenvio${endpoint}`, response.status, duration);

        if (!response.ok) {
          const errorBody = await response.text();
          throw new ProviderError(
            ErrorCode.MELHORENVIO_API_ERROR,
            `Melhor Envio API error: ${response.status}`,
            { status: response.status, body: errorBody, endpoint },
            response.status >= 500 // Only retry on server errors
          );
        }

        const data = await response.json();
        circuitBreaker.recordSuccess(tenantId, 'frete');
        return data as T;
      } catch (error) {
        lastError = error as Error;

        await circuitBreaker.recordFailure(tenantId, 'frete');

        // Handle timeout
        if (error instanceof Error && error.name === 'TimeoutError') {
          throw new ProviderError(
            ErrorCode.MELHORENVIO_TIMEOUT,
            'Melhor Envio API request timed out',
            { endpoint, timeout: melhorEnvioConfig.timeout },
            true
          );
        }

        // Retry logic
        if (attempt < maxRetries && error instanceof ProviderError && error.isRetryable) {
          const delay = melhorEnvioConfig.retryDelay * Math.pow(2, attempt); // Exponential backoff
          logger.warn(`Melhor Envio API call failed, retrying in ${delay}ms`, { attempt, endpoint }, error);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          break;
        }
      }
    }

    logger.error('Melhor Envio API call failed after retries', lastError!, { endpoint });
    throw lastError!;
  }

  /**
   * Health check: ping Melhor Envio API.
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.makeRequest('system', '/me', 'GET', undefined, 0); // No retries for health check
      return true;
    } catch (error) {
      logger.warn('Melhor Envio health check failed', {}, error as Error);
      return false;
    }
  }
}

// Export singleton instance
export const melhorEnvioProvider = new MelhorEnvioProvider();
