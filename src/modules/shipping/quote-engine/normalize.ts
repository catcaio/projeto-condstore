import { NormalizedQuote } from '../carriers/types';
import { logger } from '../../../infra/logger';

/**
 * Normalizes and validates quotes from different carrier adapters.
 *
 * - Ensures all required fields are present and valid
 * - Filters out quotes with price ≤ 0 or deliveryDays ≤ 0
 * - Applies safe defaults for optional fields
 * - Logs discarded quotes for observability
 */
export function normalizeQuotes(rawQuotes: NormalizedQuote[]): NormalizedQuote[] {
    const valid: NormalizedQuote[] = [];
    let discarded = 0;

    for (const q of rawQuotes) {
        // Required field validation
        if (!q.carrierCode || typeof q.carrierCode !== 'string') {
            discarded++;
            continue;
        }

        if (typeof q.price !== 'number' || q.price <= 0 || !Number.isFinite(q.price)) {
            discarded++;
            continue;
        }

        if (typeof q.estimatedDeliveryDays !== 'number' || q.estimatedDeliveryDays <= 0) {
            discarded++;
            continue;
        }

        // Normalize and apply safe defaults
        valid.push({
            carrierCode: q.carrierCode.trim(),
            serviceCode: q.serviceCode?.trim() || 'standard',
            serviceName: q.serviceName?.trim() || q.carrierCode,
            price: Math.round(q.price * 100) / 100, // round to 2 decimals
            estimatedDeliveryDays: Math.ceil(q.estimatedDeliveryDays), // whole days
            trackingProvided: q.trackingProvided ?? false,
            priorityScore: 0, // reset — will be set by rank step
        });
    }

    if (discarded > 0) {
        logger.info('normalize_quotes_discarded', {
            total: rawQuotes.length,
            valid: valid.length,
            discarded,
        });
    }

    return valid;
}
