/**
 * Melhor Envio Adapter.
 *
 * Calls the Melhor Envio shipping API to get quotes for light packages.
 * Returns normalized quote format compatible with the freight engine.
 */

import { logger } from '../../../infra/logger';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MelhorEnvioQuoteRequest {
    originCep: string;
    destinationCep: string;
    weight: number;    // kg
    height: number;    // cm
    width: number;     // cm
    length: number;    // cm
    insuranceValue?: number;
}

export interface MelhorEnvioQuote {
    carrier: string;
    service: string;
    price: number;
    deliveryTime: number;
    source: 'melhor_envio';
    serviceId?: number;
    error?: string;
}

// ─── API call ───────────────────────────────────────────────────────────────

const ME_API_URL = process.env.MELHOR_ENVIO_API_URL || 'https://melhorenvio.com.br/api/v2/me/shipment/calculate';

export async function getQuotesFromMelhorEnvio(request: MelhorEnvioQuoteRequest): Promise<MelhorEnvioQuote[]> {
    const token = process.env.MELHOR_ENVIO_TOKEN;

    if (!token) {
        logger.warn('melhor_envio_adapter: MELHOR_ENVIO_TOKEN not configured');
        return [];
    }

    try {
        const payload = {
            from: { postal_code: request.originCep.replace(/\D/g, '') },
            to: { postal_code: request.destinationCep.replace(/\D/g, '') },
            package: {
                weight: request.weight,
                height: Math.max(request.height, 2), // min 2cm
                width: Math.max(request.width, 11),   // min 11cm
                length: Math.max(request.length, 16),  // min 16cm
            },
            options: {
                insurance_value: request.insuranceValue || 0,
                receipt: false,
                own_hand: false,
            },
        };

        const res = await fetch(ME_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'CondStore/1.0',
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
            logger.warn('melhor_envio_adapter: API returned non-200', { status: res.status });
            return [];
        }

        const data: any[] = await res.json();

        const quotes: MelhorEnvioQuote[] = [];
        for (const item of data) {
            if (item.error) {
                logger.debug('melhor_envio_adapter: service unavailable', {
                    service: item.name, error: item.error,
                });
                continue;
            }

            if (item.price && item.delivery_time) {
                quotes.push({
                    carrier: item.company?.name || item.name || 'Unknown',
                    service: item.name || 'Standard',
                    price: parseFloat(item.price) || 0,
                    deliveryTime: parseInt(item.delivery_time) || 0,
                    source: 'melhor_envio',
                    serviceId: item.id,
                });
            }
        }

        logger.info('melhor_envio_adapter: quotes received', {
            count: quotes.length,
            destination: request.destinationCep,
            weight: request.weight,
        });

        return quotes.sort((a, b) => a.price - b.price);
    } catch (err) {
        logger.error('melhor_envio_adapter: API call failed', err instanceof Error ? err : undefined);
        return [];
    }
}
