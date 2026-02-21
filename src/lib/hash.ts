/**
 * Hashing utilities for privacy-safe logging.
 * Never log raw phone numbers or PII — always hash first.
 */

import { createHash } from 'crypto';

/**
 * Hash a phone number for privacy-safe logging.
 * Returns a stable SHA-256 hex digest. Same phone always produces same hash.
 * The hash cannot be reversed to the original number.
 *
 * @example
 * hashPhone('whatsapp:+5511987654321')
 * // → 'a3f1b2c4...' (64 hex chars)
 */
export function hashPhone(phone: string): string {
    if (!phone) return 'empty';
    return createHash('sha256').update(phone.trim().toLowerCase()).digest('hex');
}
