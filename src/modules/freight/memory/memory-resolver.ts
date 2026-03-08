/**
 * Memory Resolver — Fast indexed query for freight memory.
 *
 * Provides carrier recommendations based on confirmed freight history.
 * Read-only diagnostics: does NOT modify quoted prices.
 */

import { getDb } from '../../../infra/db';
import { freightMemory } from '../../../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MemoryQuery {
    tenantId: string;
    cepPrefix: string;
    zoneCode?: string;
    productFamily?: string;
    weightBand?: string;
    volumeBand?: string;
}

export interface MemoryResult {
    carrierName: string;
    avgConfirmedFreight: number;
    avgDelta: number;
    confirmationsCount: number;
    confidenceScore: 'low' | 'medium' | 'high';
    isAnomaly: boolean;
}

export interface FreightRecommendation {
    recommendedCarrier: string | null;
    confidenceScore: string;
    memoryMatch: boolean;
    avgConfirmedFreight: number | null;
    reason: string;
}

// ─── Memory Resolution ─────────────────────────────────────────────────────

/**
 * Query freight memory for matching patterns.
 * Returns all matching carriers sorted by confirmation count (highest confidence first).
 */
export async function resolveFreightMemory(query: MemoryQuery): Promise<MemoryResult[]> {
    try {
        const db = await getDb();
        const conditions = [
            eq(freightMemory.tenantId, query.tenantId),
            eq(freightMemory.cepPrefix, query.cepPrefix),
        ];

        if (query.zoneCode) conditions.push(eq(freightMemory.zoneCode, query.zoneCode));
        if (query.weightBand) conditions.push(eq(freightMemory.weightBand, query.weightBand));

        const rows = await db.select().from(freightMemory)
            .where(and(...conditions))
            .orderBy(desc(freightMemory.confirmationsCount))
            .limit(10);

        return rows.map(r => {
            const avgDelta = parseFloat(String(r.avgDelta)) || 0;
            const avgFreight = parseFloat(String(r.avgConfirmedFreight)) || 0;
            const deltaPercent = avgFreight > 0 ? Math.abs(avgDelta / avgFreight) * 100 : 0;

            return {
                carrierName: r.carrierName,
                avgConfirmedFreight: avgFreight,
                avgDelta,
                confirmationsCount: r.confirmationsCount,
                confidenceScore: r.confidenceScore as 'low' | 'medium' | 'high',
                isAnomaly: deltaPercent > 40,
            };
        });
    } catch {
        return [];
    }
}

// ─── Recommendation (diagnostic only) ──────────────────────────────────────

const RECOMMENDATION_DELTA_THRESHOLD = 0.15; // 15%

/**
 * Generate a diagnostic recommendation based on freight memory.
 * Does NOT modify quoted price — only recommends.
 *
 * Logic:
 * - If confidence = HIGH and avgConfirmedFreight differs from quotedFreight by <15%
 *   → mark carrier as "recommended"
 */
export function generateRecommendation(
    quotedFreight: number,
    memoryResults: MemoryResult[],
): FreightRecommendation {
    const noRec: FreightRecommendation = {
        recommendedCarrier: null,
        confidenceScore: 'none',
        memoryMatch: false,
        avgConfirmedFreight: null,
        reason: 'No memory data available',
    };

    if (memoryResults.length === 0) return noRec;

    // Find the best HIGH confidence match within 15% delta
    const highConfidence = memoryResults.filter(m => m.confidenceScore === 'high' && !m.isAnomaly);

    for (const m of highConfidence) {
        if (quotedFreight <= 0 || m.avgConfirmedFreight <= 0) continue;

        const diff = Math.abs(quotedFreight - m.avgConfirmedFreight);
        const diffPercent = diff / m.avgConfirmedFreight;

        if (diffPercent <= RECOMMENDATION_DELTA_THRESHOLD) {
            return {
                recommendedCarrier: m.carrierName,
                confidenceScore: 'high',
                memoryMatch: true,
                avgConfirmedFreight: m.avgConfirmedFreight,
                reason: `${m.confirmationsCount} confirmations, ${(diffPercent * 100).toFixed(1)}% variance from avg confirmed`,
            };
        }
    }

    // Fall back to best available match
    const best = memoryResults[0];
    return {
        recommendedCarrier: null,
        confidenceScore: best.confidenceScore,
        memoryMatch: true,
        avgConfirmedFreight: best.avgConfirmedFreight,
        reason: best.confidenceScore === 'high'
            ? 'High confidence match but price divergence exceeds 15%'
            : `${best.confirmationsCount} confirmations (${best.confidenceScore} confidence)`,
    };
}
