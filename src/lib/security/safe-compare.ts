/**
 * Safely compares two strings in constant time to prevent timing attacks.
 * Edge-compatible implementation.
 * 
 * @param a The first string
 * @param b The second string
 * @returns boolean True if strings are exactly equal, false otherwise
 */
export function safeCompare(a?: string | null, b?: string | null): boolean {
    if (typeof a !== 'string' || typeof b !== 'string') {
        return false;
    }

    if (a.length !== b.length) {
        return false;
    }

    let mismatch = 0;
    for (let i = 0; i < a.length; i++) {
        mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return mismatch === 0;
}
