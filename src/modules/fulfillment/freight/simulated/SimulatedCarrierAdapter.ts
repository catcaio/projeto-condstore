import { CarrierAdapter, CarrierHealth, NormalizedQuote, QuoteInput } from '../carriers/types';

// Reuse logic from the old simulated-carriers.ts file, but tailored per instance
function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % 1000;
}

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

export interface SimulatedCarrierConfig {
    code: string;
    name: string;
    service: string;
    baseCents: number;
    perKgCents: number;
    baseDays: number;
    trackable: boolean;
    simulateLatencyMs?: number;
    forceError?: boolean;
}

export class SimulatedCarrierAdapter implements CarrierAdapter {
    id: string;
    name: string;

    constructor(private config: SimulatedCarrierConfig, private index: number = 0, private intentIdSeed: string = 'default') {
        this.id = config.code;
        this.name = config.name;
    }

    async getQuotes(input: QuoteInput): Promise<NormalizedQuote[]> {
        // Enforce arbitrary latency
        if (this.config.simulateLatencyMs) {
            await new Promise(r => setTimeout(r, this.config.simulateLatencyMs));
        }

        if (this.config.forceError) {
            throw new Error(`Carrier ${this.id} API error or offline`);
        }

        const jitter = simpleHash(this.intentIdSeed);
        const dist = distanceBucket(input.originCep, input.destinationCep);

        const volumetricKg =
            input.widthCm && input.heightCm && input.lengthCm
                ? (input.widthCm * input.heightCm * input.lengthCm) / 6000
                : 0;
        const effectiveKg = Math.max(input.weightInKg, volumetricKg);

        const carrierJitter = ((jitter + this.index * 137) % 400) - 200; // -200..+199 cents
        const priceCents = this.config.baseCents + this.config.perKgCents * effectiveKg + DIST_PRICE_FACTOR[dist] + carrierJitter;
        const days = this.config.baseDays + DIST_DAYS_FACTOR[dist] + (this.index % 2 === 0 ? 0 : 1);

        return [{
            carrierCode: this.config.code,
            serviceCode: this.config.service.toLowerCase().replace(/[^a-z0-9]/g, '_'),
            serviceName: `${this.config.name} – ${this.config.service}`,
            price: Math.max(Math.round(priceCents) / 100, 5.0), // min R$5.00
            estimatedDeliveryDays: Math.max(days, 1),
            trackingProvided: this.config.trackable,
            priorityScore: 0,
        }];
    }

    async checkHealth(): Promise<CarrierHealth> {
        return {
            status: this.config.forceError ? 'down' : 'healthy',
            latencyMs: this.config.simulateLatencyMs || 50,
            lastCheckedAt: new Date(),
        };
    }
}
