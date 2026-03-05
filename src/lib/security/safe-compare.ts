import crypto from 'node:crypto';

/**
 * Safely compares two strings in constant time to prevent timing attacks.
 * Uses Node's native crypto.timingSafeEqual.
 * 
 * @param a The first string
 * @param b The second string
 * @returns boolean True if strings are exactly equal, false otherwise
 */
export function safeCompare(a?: string | null, b?: string | null): boolean {
    if (typeof a !== 'string' || typeof b !== 'string') {
        return false;
    }

    // Both strings must be the same length to use timingSafeEqual.
    // However, if they are different lengths, we must not leak the length difference
    // through early returns if possible, or at least we must make sure we don't 
    // throw an error when lengths differ. Node's timingSafeEqual throws if lengths differ.

    // Convert to buffers
    const bufferA = Buffer.from(a, 'utf8');
    const bufferB = Buffer.from(b, 'utf8');

    if (bufferA.length !== bufferB.length) {
        // Return false immediately but safely. 
        // Note: Length is technically leaked here, but token lengths are usually fixed.
        // Doing a constant time compare on different lengths is not supported by timingSafeEqual.
        return false;
    }

    try {
        return crypto.timingSafeEqual(bufferA, bufferB);
    } catch {
        // Failsafe catch block, though shouldn't be hit due to length check
        return false;
    }
}
