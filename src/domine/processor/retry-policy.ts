/**
 * Retry policy for Domine Event Processing.
 * Exponential backoff: immediate → 30s → 5m → 30m → DLQ
 */

const RETRY_DELAYS_MS = [
    0,           // 1st retry: immediate
    30_000,      // 2nd retry: 30s
    300_000,     // 3rd retry: 5m
    1_800_000,   // 4th retry: 30m
];

export const MAX_RETRIES = RETRY_DELAYS_MS.length;

export function getNextRetryAt(retryCount: number): Date | null {
    if (retryCount >= MAX_RETRIES) return null; // should go to DLQ
    const delayMs = RETRY_DELAYS_MS[retryCount] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
    return new Date(Date.now() + delayMs);
}

export function shouldMoveToDLQ(retryCount: number): boolean {
    return retryCount >= MAX_RETRIES;
}
