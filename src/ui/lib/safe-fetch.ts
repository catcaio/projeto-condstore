export interface SafeFetchOptions extends RequestInit {
    timeoutMs?: number;
    maxRetries?: number;
    baseBackoffMs?: number;
}

export class SafeFetchError extends Error {
    constructor(
        message: string,
        public readonly status?: number,
        public readonly response?: Response
    ) {
        super(message);
        this.name = 'SafeFetchError';
    }
}

/**
 * Executes a fetch request with built-in protections:
 * - Configurable timeout (default 10s)
 * - Exponential backoff with jitter for retries
 * - Stops retrying automatically on 401, 403
 * - Respects Retry-After header for 429 Too Many Requests
 * - Bounded retries to prevent infinite loops (default 3)
 */
export async function safeFetch(url: string, options: SafeFetchOptions = {}): Promise<Response> {
    const {
        timeoutMs = 10000,
        maxRetries = 3,
        baseBackoffMs = 1000,
        ...fetchOptions
    } = options;

    let attempt = 0;

    while (attempt <= maxRetries) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        // Keep existing signal if provided, but our timeout will also abort
        const combinedSignal = fetchOptions.signal;
        let extAbortListener: (() => void) | null = null;
        if (combinedSignal) {
            extAbortListener = () => controller.abort();
            combinedSignal.addEventListener('abort', extAbortListener);
            if (combinedSignal.aborted) controller.abort();
        }

        try {
            const response = await fetch(url, {
                ...fetchOptions,
                signal: controller.signal
            });

            // Cleanup
            clearTimeout(timeoutId);
            if (combinedSignal && extAbortListener) {
                combinedSignal.removeEventListener('abort', extAbortListener);
            }

            // Success or explicit non-retryable response -> return immediately
            if (response.ok) {
                return response;
            }

            // Stop retrying on 401, 403, and strictly Client Errors that are not 429
            if (
                response.status === 401 ||
                response.status === 403 ||
                (response.status >= 400 && response.status < 500 && response.status !== 429)
            ) {
                return response;
            }

            // If we are out of retries, return the last response (could be 500, 429)
            if (attempt >= maxRetries) {
                return response;
            }

            // We will retry (e.g., 429, 502, 503, 504)
            let delayMs = baseBackoffMs * Math.pow(2, attempt);

            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                if (retryAfter) {
                    const parsed = parseInt(retryAfter, 10);
                    if (!isNaN(parsed)) {
                        delayMs = parsed * 1000;
                    } else {
                        const dateNum = Date.parse(retryAfter);
                        if (!isNaN(dateNum)) {
                            delayMs = Math.max(1000, dateNum - Date.now()); // Ensure at least 1s positive
                        }
                    }
                }
            }

            // Add Jitter (0 to 30% of delay)
            const jitter = delayMs * 0.3 * Math.random();
            const finalDelay = delayMs + jitter;

            await new Promise(res => setTimeout(res, finalDelay));
            attempt++;

        } catch (error: any) {
            clearTimeout(timeoutId);

            // If out of retries or it's a non-retryable client abort
            if (attempt >= maxRetries || (error.name === 'AbortError' && combinedSignal?.aborted)) {
                throw error;
            }

            // Compute wait time for retry (network failure or abort)
            let delayMs = baseBackoffMs * Math.pow(2, attempt);
            const jitter = delayMs * 0.3 * Math.random();
            const finalDelay = delayMs + jitter;

            await new Promise(res => setTimeout(res, finalDelay));
            attempt++;
        }
    }

    throw new SafeFetchError('safeFetch failed unconditionally (should never reach here)');
}
