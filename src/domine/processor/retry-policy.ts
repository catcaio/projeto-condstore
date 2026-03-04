/**
 * Retry policy for Domine Event Processing.
 * Backoff schedule: 1m → 5m → 15m → 60m → DLQ
 */

const RETRY_DELAYS_MS = [
    60_000,       // 1st retry: 1m
    300_000,      // 2nd retry: 5m
    900_000,      // 3rd retry: 15m
    3_600_000,    // 4th retry: 60m (cap)
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
