/**
 * Carrier Router.
 *
 * Selects the optimal freight strategy based on package characteristics
 * and destination region.
 *
 * Strategies:
 * - melhor_envio: Light packages (≤15kg OR longest dim ≤200cm)
 * - table_carriers: Heavy packages to Sul/Sudeste (SC,PR,RS,SP,MG,RJ)
 * - braspress_api: Heavy packages to other regions
 */

import { extractStateFromCep } from '@/core/freight/zone-resolver';
import { logger } from '@/infra/logger';

// ─── Types ──────────────────────────────────────────────────────────────────

export type RoutingStrategy = 'melhor_envio' | 'table_carriers' | 'braspress_api';

export interface RoutingRequest {
    tenantId: string;
    originCep: string;
    destinationCep: string;
    totalWeight: number;    // kg
    cubedWeight: number;    // kg
    chargedWeight: number;  // kg
    volumes: number;
    longestDimensionCm: number;
    zoneCode?: string;
}

export interface RoutingResult {
    strategy: RoutingStrategy;
    eligibleCarriers: string[];
    reason: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MELHOR_ENVIO_MAX_WEIGHT_KG = 15;
const MELHOR_ENVIO_MAX_DIMENSION_CM = 200;
const TABLE_CARRIER_REGIONS = new Set(['SC', 'PR', 'RS', 'SP', 'MG', 'RJ']);

// ─── Router ─────────────────────────────────────────────────────────────────

export function selectCarrierStrategy(request: RoutingRequest): RoutingResult {
    const destinationState = extractStateFromCep(request.destinationCep.replace(/\D/g, ''));

    // Rule 1: Light/small packages → Melhor Envio
    if (request.chargedWeight <= MELHOR_ENVIO_MAX_WEIGHT_KG && request.longestDimensionCm <= MELHOR_ENVIO_MAX_DIMENSION_CM) {
        const reason = `Charged weight ${request.chargedWeight}kg ≤ ${MELHOR_ENVIO_MAX_WEIGHT_KG}kg AND longest dimension ${request.longestDimensionCm}cm ≤ ${MELHOR_ENVIO_MAX_DIMENSION_CM}cm`;

        logger.info('carrier_router: melhor_envio selected', {
            reason, chargedWeight: request.chargedWeight,
            longestDim: request.longestDimensionCm, destination: destinationState,
        });

        return {
            strategy: 'melhor_envio',
            eligibleCarriers: ['melhor_envio'],
            reason,
        };
    }

    // Rule 2: Heavy packages to Sul/Sudeste → Table carriers (Movvi, Mengue)
    if (destinationState && TABLE_CARRIER_REGIONS.has(destinationState)) {
        const reason = `Heavy package (${request.chargedWeight}kg) to ${destinationState} — table carriers preferred`;

        logger.info('carrier_router: table_carriers selected', {
            reason, chargedWeight: request.chargedWeight, destination: destinationState,
        });

        return {
            strategy: 'table_carriers',
            eligibleCarriers: ['movvi', 'mengue'],
            reason,
        };
    }

    // Rule 3: Everything else → Braspress API
    const reason = `Heavy package (${request.chargedWeight}kg) to ${destinationState || 'unknown'} — Braspress API required`;

    logger.info('carrier_router: braspress_api selected', {
        reason, chargedWeight: request.chargedWeight, destination: destinationState,
    });

    return {
        strategy: 'braspress_api',
        eligibleCarriers: ['braspress'],
        reason,
    };
}
