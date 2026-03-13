import crypto from 'node:crypto';

/**
 * Normalizes a Brazilian phone number to standard E.164 format (+55).
 * Rules:
 * - Keeps only digits.
 * - Adds +55 if omitted but DDI is 55.
 * - Assumes +55 if no country code and length implies Brazilian numbers (10 or 11 digits).
 * 
 * @param phone Raw phone string
 * @returns Clean E.164 phone string without the '+' prefix internally or with it?
 * The requirement asks for +5548999999999.
 */
export function normalizePhone(phone: string | null | undefined): string | null {
    if (!phone) return null;

    // Remove all non-numeric characters
    let digits = phone.replace(/\D/g, '');

    if (!digits) return null;

    // If it starts with 55, we assume it has the country code.
    // If length is 10 or 11, it's a local BR number without 55.
    if (digits.length === 10 || digits.length === 11) {
        digits = `55${digits}`;
    }

    // If it has 12 or 13 digits and starts with 55, it's correct.
    // Ensure the '+' prefix for E.164 format
    return `+${digits}`;
}

/**
 * Validates if the phone number is roughly a valid E.164.
 */
export function isValidE164(phone: string | null | undefined): boolean {
    if (!phone) return false;
    return /^\+[1-9]\d{1,14}$/.test(phone);
}

/**
 * Hash phone number using SHA-256 for privacy-safe storage.
 */
export function hashPhone(phone: string): string {
    const raw = phone.trim();
    // In actual enterprise deployment this could append a salt or pepper
    return crypto.createHash('sha256').update(raw).digest('hex');
}

