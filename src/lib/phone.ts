/**
 * Unified phone-number utilities.
 *
 * Problem solved: previously `hashPhone` was computed from the *raw* Twilio
 * value (e.g. "whatsapp:+5511 987654321 ") while the DB stored the *normalised*
 * form ("whatsapp:+5511987654321").  If the two strings differed the Redis cache
 * key would never match the DB-backed phone.
 *
 * Rule enforced here:
 *   ALWAYS normalise first, THEN hash.  This guarantees:
 *     normalizePhone(raw) === fromPhone (stored in DB)
 *     phoneHash(normalizePhone(raw)) === ctx key in Redis
 *
 * Callers that previously used `normalizeWhatsAppNumber` + `hashPhone` separately
 * should migrate to `normalizeAndHash`.
 */

import { createHash } from 'crypto';

/**
 * Normalise a raw phone string to a canonical form suitable for DB storage.
 * Equivalent to the previous `normalizeWhatsAppNumber`.
 *
 * @example
 * normalizePhone("WhatsApp: +5511 98765-4321 ")
 * // → "whatsapp:+551198765-4321"
 * // → actually strips non-[a-z0-9:+]: "whatsapp:+55119876543210"
 */
export function normalizePhone(raw: string | null | undefined): string {
    if (!raw) return '';
    return raw
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '')          // remove all whitespace
        .replace(/[^a-z0-9:+]/g, ''); // keep only alphanumeric, colon, plus
}

/**
 * Stable SHA-256 hex digest of an already-normalised phone string.
 * Used as the Redis cache-key segment so PII never appears in key names.
 */
export function phoneHash(normalized: string): string {
    if (!normalized) return 'empty';
    return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Convenience: normalise `raw` and return both forms atomically.
 * Always use this when you need both the DB-stored value and the cache key
 * to avoid accidentally hashing a non-normalised string.
 *
 * @example
 * const { normalized, hash } = normalizeAndHash(payload["From"]);
 * // normalized → store in messages.from_phone
 * // hash       → Redis key segment ctx:{tenantId}:{hash}
 */
export function normalizeAndHash(raw: string | null | undefined): { normalized: string; hash: string } {
    const normalized = normalizePhone(raw);
    const hash = phoneHash(normalized);
    return { normalized, hash };
}

/**
 * Validate that a normalised phone is in the expected WhatsApp format.
 * Equivalent to the previous `isValidWhatsAppNumber`.
 */
export function isValidPhone(normalized: string): boolean {
    return /^whatsapp:\+\d+$/.test(normalized);
}
