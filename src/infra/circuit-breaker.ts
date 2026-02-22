/**
 * Simple in-memory circuit breaker for the WhatsApp webhook.
 *
 * Rules:
 *  - 5 consecutive internal errors within a 2-minute window → OPEN state
 *  - While OPEN: webhook returns fixed TwiML fallback, skips all downstream calls
 *  - Auto-reset to CLOSED after the 2-minute window has elapsed since last failure
 *
 * This is intentionally simple (no half-open state) because:
 *  - We're in a serverless/edge context; persistent state across invocations isn't guaranteed
 *  - The goal is short-term protection against cascading failures, not long-term tracking
 */

import { logger } from './logger';

const FAILURE_THRESHOLD = 5;
const WINDOW_MS = 2 * 60 * 1000; // 2 minutes

export const CIRCUIT_FALLBACK_MESSAGE =
    'Estamos instáveis no momento. Tente novamente em instantes.';

interface CircuitState {
    consecutiveFailures: number;
    openedAt: number | null; // timestamp when circuit opened
    lastFailureAt: number | null; // timestamp of last failure
}

// Module-level singleton — survives across requests in the same process/container
const state: CircuitState = {
    consecutiveFailures: 0,
    openedAt: null,
    lastFailureAt: null,
};

/**
 * Returns true if the circuit is currently OPEN (downstream calls should be skipped).
 * Auto-resets after WINDOW_MS has passed since circuit was opened.
 */
export function isCircuitOpen(): boolean {
    if (state.openedAt === null) return false;

    const now = Date.now();
    const elapsed = now - state.openedAt;

    if (elapsed >= WINDOW_MS) {
        // Auto-reset: window has elapsed
        logger.info('Circuit breaker auto-reset to CLOSED', {
            event: 'circuit_breaker_reset',
            openedAt: new Date(state.openedAt).toISOString(),
            elapsedMs: elapsed,
        });
        state.consecutiveFailures = 0;
        state.openedAt = null;
        state.lastFailureAt = null;
        return false;
    }

    return true;
}

/**
 * Record a successful processing. Resets the consecutive failure counter.
 */
export function recordSuccess(): void {
    if (state.consecutiveFailures > 0) {
        state.consecutiveFailures = 0;
        state.lastFailureAt = null;
        // Don't reset openedAt here — only auto-reset by window expiry
    }
}

/**
 * Record an internal error. Opens the circuit if the threshold is reached.
 */
export function recordFailure(): void {
    const now = Date.now();
    state.consecutiveFailures += 1;
    state.lastFailureAt = now;

    if (state.consecutiveFailures >= FAILURE_THRESHOLD && state.openedAt === null) {
        state.openedAt = now;
        logger.warn('Circuit breaker OPENED', {
            event: 'circuit_breaker_opened',
            consecutiveFailures: state.consecutiveFailures,
            threshold: FAILURE_THRESHOLD,
            windowMs: WINDOW_MS,
        });
    }
}

/**
 * Expose current state for the health check endpoint.
 */
export function getCircuitBreakerStatus(): {
    state: 'open' | 'closed';
    consecutiveFailures: number;
    openedAt: string | null;
} {
    return {
        state: isCircuitOpen() ? 'open' : 'closed',
        consecutiveFailures: state.consecutiveFailures,
        openedAt: state.openedAt ? new Date(state.openedAt).toISOString() : null,
    };
}
