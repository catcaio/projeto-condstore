export interface QuoteInput {
    originCep: string;
    destinationCep: string;
    weightInKg: number;
    widthCm?: number;
    heightCm?: number;
    lengthCm?: number;
    insuranceValue?: number;
    packageType: 'box' | 'envelope';
}

export interface NormalizedQuote {
    carrierCode: string; // e.g., 'correios', 'jadlog'
    serviceCode: string; // e.g., 'pac', 'sedex'
    serviceName: string; // Full readable name
    price: number;
    estimatedDeliveryDays: number;
    trackingProvided: boolean;
    priorityScore: number; // For internal ranking
}

export interface CarrierHealth {
    status: 'healthy' | 'degraded' | 'down';
    latencyMs: number;
    lastCheckedAt: Date;
}

export interface CarrierAdapter {
    id: string; // Internal identifier
    name: string; // Display name
    getQuotes(input: QuoteInput): Promise<NormalizedQuote[]>;
    checkHealth(): Promise<CarrierHealth>;
}
