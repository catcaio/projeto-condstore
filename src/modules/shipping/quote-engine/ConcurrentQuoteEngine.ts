import { CarrierAdapter, NormalizedQuote, QuoteInput } from '../carriers/types';

export interface QuoteEngineResult {
    quotes: NormalizedQuote[];
    bestPriceId: string;
    bestSpeedId: string;
    summary: {
        respondedCarriers: string[];
        failedCarriers: { id: string; reason: string }[];
        totalDurationMs: number;
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

        // Ranking
        const byPrice = [...allQuotes].sort((a, b) => a.price - b.price);
        const bySpeed = [...allQuotes].sort((a, b) => a.estimatedDeliveryDays - b.estimatedDeliveryDays || a.price - b.price);

        const bestPriceId = byPrice[0]?.carrierCode ?? '';
        const bestSpeedId = bySpeed[0]?.carrierCode ?? '';

        const ranked = allQuotes.map(q => ({
            ...q,
            priorityScore:
                q.carrierCode === bestPriceId ? 1 :
                    q.carrierCode === bestSpeedId ? 2 : 5
        }));

        ranked.sort((a, b) => a.priorityScore - b.priorityScore);

        return {
            quotes: ranked,
            bestPriceId,
            bestSpeedId,
            summary: {
                respondedCarriers,
                failedCarriers,
                totalDurationMs: Date.now() - startTime
            }
        };
    }
}
