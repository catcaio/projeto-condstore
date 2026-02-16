/**
 * Normalization utilities for WhatsApp numbers and Twilio payloads.
 */

/**
 * Normalizes a WhatsApp number to match database format.
 * 
 * Handles various formats:
 * - "WhatsApp: +14155238886" (with capital W and space)
 * - "whatsapp:+14155238886" (standard format)
 * - "whatsapp: +14155238886" (with space after colon)
 * - " whatsapp:+14155238886 " (with leading/trailing whitespace)
 * 
 * @param phone - Raw phone number from Twilio payload
 * @returns Normalized phone number in format "whatsapp:+XXXXXXXXXXX"
 */
export function normalizeWhatsAppNumber(phone: string | null | undefined): string {
    if (!phone) {
        return '';
    }

    return phone
        .trim()                           // Remove leading/trailing whitespace
        .toLowerCase()                    // Convert to lowercase
        .replace(/\s+/g, '')              // Remove ALL whitespace (including spaces after colon)
        .replace(/[^a-z0-9:+]/g, '');     // Remove any special characters except : and +
}

/**
 * Validates if a normalized WhatsApp number has the correct format.
 * 
 * @param normalized - Normalized phone number
 * @returns true if format is valid
 */
export function isValidWhatsAppNumber(normalized: string): boolean {
    // Must start with "whatsapp:" and have a phone number with +
    return /^whatsapp:\+\d+$/.test(normalized);
}
