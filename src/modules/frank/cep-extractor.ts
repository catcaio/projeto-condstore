/**
 * CEP Extractor.
 *
 * Extracts Brazilian CEP (postal code) from free text.
 * Supports formats: 01310100, 01310-100
 */

const CEP_REGEX = /\b(\d{5})-?(\d{3})\b/;

/**
 * Extract the first CEP found in the text.
 * Returns formatted CEP (XXXXX-XXX) or null.
 */
export function extractCep(text: string): string | null {
    if (!text) return null;
    const match = text.match(CEP_REGEX);
    if (!match) return null;
    return `${match[1]}-${match[2]}`;
}

/**
 * Extract raw CEP digits (8 chars) or null.
 */
export function extractCepRaw(text: string): string | null {
    if (!text) return null;
    const match = text.match(CEP_REGEX);
    if (!match) return null;
    return `${match[1]}${match[2]}`;
}
