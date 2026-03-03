// ---------------------------------------------------------------------------
// Concierge Wiring Helper — client-side helper that runs the concierge
// pipeline (context → options → recommendation) with full error isolation.
// If ANY step fails, returns null so the caller can fallback to default UI.
// ---------------------------------------------------------------------------

import type { ConciergeOption, ConciergeRecommendation } from '@/modules/concierge/concierge.types';
import { buildConciergeContext } from '@/modules/concierge/context.builder';
import { generateOptionsForCotacao } from '@/modules/concierge/option.engine';
import { buildRecommendation } from '@/modules/concierge/recommendation.engine';

export interface ConciergeResult {
    options: ConciergeOption[];
    recommendation: ConciergeRecommendation;
}

/**
 * Run the full concierge pipeline for a cotação simulada.
 *
 * Returns null if any step fails (safe fallback).
 * Never throws — all exceptions are caught internally.
 */
export function runConciergePipeline(
    originCep: string | undefined,
    destinationCep: string | undefined,
    weight: number | undefined,
): ConciergeResult | null {
    try {
        if (!originCep || !destinationCep || !weight) {
            return null;
        }

        // 1. Build validated context (also validates forbidden fields / minimisation)
        buildConciergeContext('cotacao_simulada', {
            originCep,
            destinationCep,
            weight,
        });

        // 2. Generate deterministic options
        const options = generateOptionsForCotacao({
            originCep,
            destinationCep,
            weight,
        });

        // 3. Build recommendation
        const recommendation = buildRecommendation(options);

        return { options, recommendation };
    } catch {
        return null;
    }
}
