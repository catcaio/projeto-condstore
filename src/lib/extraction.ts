
/**
 * Extracts a valid CEP (Brazilian formatted or unformatted) from a text string.
 * Returns the sanitized 8-digit CEP or null if not found/invalid.
 */
export function extractCep(text: string): string | null {
    if (!text) return null;

    // Regex to match:
    // \b word boundary
    // \d{5} first 5 digits
    // -? optional hyphen
    // \d{3} last 3 digits
    // \b word boundary
    const regex = /\b\d{5}-?\d{3}\b/g;

    const matches = text.match(regex);

    if (matches && matches.length > 0) {
        // Take the first match
        const rawCep = matches[0];
        // Remove non-digit chars
        const cleanCep = rawCep.replace(/\D/g, '');

        if (cleanCep.length === 8) {
            // Re-format implies returning standard format? 
            // The requirement says "Sanitizar para 8 dígitos".
            // Let's return formatted "XXXXX-XXX" for consistency or just 8 digits?
            // "Sanitizar para 8 dígitos" usually means returning the raw digits string or the formatted one.
            // Let's return the standard formatted one 12345-678 because typical services expect it or handle it.
            // But wait, the previous code used "cleanMessage.match".
            // Let's return formatted: 12345-678.
            return `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`;
        }
    }

    return null;
}
