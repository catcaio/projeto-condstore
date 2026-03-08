import { CarrierAdapter, NormalizedQuote, QuoteInput } from '../carriers/types';
import { normalizeQuotes } from './normalize';
import { rankQuotes } from './rank';

export interface QuoteEngineResult {
    quotes: NormalizedQuote[];
    bestPriceId: string;
    bestSpeedId: string;
    summary: {
        respondedCarriers: string[];
        failedCarriers: { id: string; reason: string }[];
        totalDurationMs: number;
        rawCount: number;
        normalizedCount: number;
    };
}

export interface QuoteEngineOptions {
    tenantId: string;
    intentId: string;
    input: QuoteInput;
    adapters: CarrierAdapter[];
    timeoutMs?: number;
    concurrencyLimit?: number;
}

export class ConcurrentQuoteEngine {
    static async run(options: QuoteEngineOptions): Promise<QuoteEngineResult> {
        const { adapters, input, timeoutMs = 6000, concurrencyLimit = 3 } = options;
        const startTime = Date.now();

        const respondedCarriers: string[] = [];
        const failedCarriers: { id: string; reason: string }[] = [];
        const allQuotes: NormalizedQuote[] = [];

        // Simple concurrency queue limit logic
        let i = 0;
        const execQueue = async () => {
            while (i < adapters.length) {
                const adapter = adapters[i++];
                if (!adapter) continue;

                // Promise race for timeout
                const apiCall = adapter.getQuotes(input);
                const timeoutCall = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), timeoutMs)
                );

                try {
                    const result = await Promise.race([apiCall, timeoutCall]);
                    allQuotes.push(...result);
                    respondedCarriers.push(adapter.id);
                } catch (err: any) {
                    const reason = err.message === 'TIMEOUT_EXCEEDED' ? 'TIMEOUT_EXCEEDED' : 'API_ERROR';
                    failedCarriers.push({ id: adapter.id, reason });
                }
            }
        };

        const workers = Array.from({ length: Math.min(concurrencyLimit, adapters.length) }).map(() => execQueue());
        await Promise.all(workers);

        const rawCount = allQuotes.length;

        // ── Normalize: validate, filter, apply safe defaults ────────────
        const normalized = normalizeQuotes(allQuotes);

        // ── Rank: deterministic weighted-score (price, delivery, tracking, health)
        const ranked = rankQuotes(normalized, input);

        // Derive best-of indicators from normalized set
        const byPrice = [...normalized].sort((a, b) => a.price - b.price);
        const bySpeed = [...normalized].sort((a, b) => a.estimatedDeliveryDays - b.estimatedDeliveryDays || a.price - b.price);

        const bestPriceId = byPrice[0]?.carrierCode ?? '';
        const bestSpeedId = bySpeed[0]?.carrierCode ?? '';

        return {
            quotes: ranked,
            bestPriceId,
            bestSpeedId,
            summary: {
                respondedCarriers,
                failedCarriers,
                totalDurationMs: Date.now() - startTime,
                rawCount,
                normalizedCount: normalized.length,
            }
        };
    }
}
