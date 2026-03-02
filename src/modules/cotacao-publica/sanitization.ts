export interface PublicQuoteIntentPayload {
    originCep: string;
    destinationCep: string;
    weightInKg: number;
    widthCm?: number | null;
    heightCm?: number | null;
    lengthCm?: number | null;
    insuranceValue?: number | null;
    packageType: 'box' | 'envelope';
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    utmTerm?: string | null;
    utmContent?: string | null;
    referrer?: string | null;
    landingPath?: string | null;
    clientTs: number;
}

export function sanitizeQuoteIntentPayload(payload: any): Partial<PublicQuoteIntentPayload> {
    // Strip anything not in the schema explicitly to avoid PII leak
    return {
        originCep: sanitizeCep(payload?.originCep),
        destinationCep: sanitizeCep(payload?.destinationCep),
        weightInKg: parseNumber(payload?.weightInKg),
        widthCm: parseNumber(payload?.widthCm),
        heightCm: parseNumber(payload?.heightCm),
        lengthCm: parseNumber(payload?.lengthCm),
        insuranceValue: parseNumber(payload?.insuranceValue),
        packageType: payload?.packageType === 'envelope' ? 'envelope' : 'box',
        ...sanitizeUtms(payload)
    };
}

function sanitizeCep(input: any): string {
    if (typeof input !== 'string') return '';
    return input.replace(/\D/g, '').slice(0, 8);
}

function parseNumber(input: any): number | undefined {
    if (typeof input === 'number') return input;
    if (typeof input === 'string') {
        const parsed = parseFloat(input);
        return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
}

function sanitizeUtms(payload: any) {
    const cap = (str: any) => typeof str === 'string' ? str.trim().slice(0, 128) : undefined;
    return {
        utmSource: cap(payload?.utmSource),
        utmMedium: cap(payload?.utmMedium),
        utmCampaign: cap(payload?.utmCampaign),
        utmTerm: cap(payload?.utmTerm),
        utmContent: cap(payload?.utmContent),
        referrer: cap(payload?.referrer),
        landingPath: cap(payload?.landingPath),
    };
}
