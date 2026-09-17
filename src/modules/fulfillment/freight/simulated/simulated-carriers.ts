import type { NormalizedQuote, QuoteInput } from '../carriers/types';

/**
 * 5 simulated carrier profiles.
 * Each has base pricing/timing parameters used by the deterministic algorithm.
 */
const CARRIERS = [
    { code: 'correios_sim', name: 'Correios (Simulado)', service: 'PAC', baseCents: 1890, perKgCents: 320, baseDays: 5, trackable: true },
    { code: 'correios_sedex_sim', name: 'Correios (Simulado)', service: 'SEDEX', baseCents: 2990, perKgCents: 480, baseDays: 2, trackable: true },
    { code: 'jadlog_sim', name: 'Jadlog (Simulado)', service: '.Package', baseCents: 2190, perKgCents: 350, baseDays: 4, trackable: true },
    { code: 'totalexpress_sim', name: 'Total Express (Simulado)', service: 'Standard', baseCents: 1690, perKgCents: 290, baseDays: 7, trackable: false },
    { code: 'loggi_sim', name: 'Loggi (Simulado)', service: 'Express', baseCents: 3490, perKgCents: 510, baseDays: 1, trackable: true },
    { code: 'azulcargo_sim', name: 'Azul Cargo (Simulado)', service: 'Aéreo', baseCents: 4290, perKgCents: 620, baseDays: 1, trackable: true },
] as const;

/**
 * Simple deterministic hash from a string → number 0..999.
 * Used for per-intent jitter so the same intentId always produces the same quotes.
 */
function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % 1000;
}

/**
 * Derive a rough "distance bucket" from CEP prefix difference.
 * CEPs share the same first digit = same region ≈ short distance.
 */
function distanceBucket(originCep: string, destCep: string): number {
    const oPrefix = parseInt(originCep.slice(0, 3), 10) || 0;
    const dPrefix = parseInt(destCep.slice(0, 3), 10) || 0;
    const diff = Math.abs(oPrefix - dPrefix);
    if (diff < 10) return 0;   // same metro
    if (diff < 50) return 1;   // same state
    if (diff < 200) return 2;  // neighboring states
    return 3;                   // cross-country
}

const DIST_PRICE_FACTOR = [0, 350, 780, 1450];  // cents
const DIST_DAYS_FACTOR = [0, 1, 2, 4];

/**
 * Generate deterministic simulated quotes for given input + intentId seed.
 */
export function generateSimulatedQuotes(input: QuoteInput, intentId: string): NormalizedQuote[] {
    const jitter = simpleHash(intentId);
    const dist = distanceBucket(input.originCep, input.destinationCep);

    // Volumetric weight (divisor 6000 is common)
    const volumetricKg =
        input.widthCm && input.heightCm && input.lengthCm
            ? (input.widthCm * input.heightCm * input.lengthCm) / 6000
            : 0;
    const effectiveKg = Math.max(input.weightInKg, volumetricKg);

    return CARRIERS.map((c, idx) => {
        const carrierJitter = ((jitter + idx * 137) % 400) - 200; // -200..+199 cents
        const priceCents = c.baseCents + c.perKgCents * effectiveKg + DIST_PRICE_FACTOR[dist] + carrierJitter;
        const days = c.baseDays + DIST_DAYS_FACTOR[dist] + (idx % 2 === 0 ? 0 : 1);

        return {
            carrierCode: c.code,
            serviceCode: c.service.toLowerCase().replace(/[^a-z0-9]/g, '_'),
            serviceName: `${c.name} – ${c.service}`,
            price: Math.max(Math.round(priceCents) / 100, 5.0), // min R$5.00
            estimatedDeliveryDays: Math.max(days, 1),
            trackingProvided: c.trackable,
            priorityScore: 0, // will be set by ranking
        };
    });
}
