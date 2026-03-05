import { structuredLogger } from '@/infra/log/logger';
import { CircuitOpenError } from './errors';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface BreakerState {
    state: CircuitState;
    failures: number;
    successes: number; // for half-open
    nextAttempt: number | null; // cooldown expiration timestamp
}

export interface CircuitBreakerConfig {
    failureThreshold?: number; // default 5
    cooldownPeriod?: number; // default 30000ms (30s)
    successThreshold?: number; // default 2
}

export class CircuitBreaker {
    private states = new Map<string, BreakerState>();
    private readonly failureThreshold: number;
    private readonly cooldownPeriod: number;
    private readonly successThreshold: number;

    constructor(config: CircuitBreakerConfig = {}) {
        this.failureThreshold = config.failureThreshold ?? 5;
        this.cooldownPeriod = config.cooldownPeriod ?? 30000;
        this.successThreshold = config.successThreshold ?? 2;
    }

    private getState(provider: string): BreakerState {
        let state = this.states.get(provider);
        if (!state) {
            state = { state: 'CLOSED', failures: 0, successes: 0, nextAttempt: null };
            this.states.set(provider, state);
        }
        return state;
    }

    private transitionToOpen(provider: string, state: BreakerState) {
        state.state = 'OPEN';
        state.nextAttempt = Date.now() + this.cooldownPeriod;
        structuredLogger.error('circuit_open', {
            eventType: 'circuit_breaker_transition',
            provider,
            failures: state.failures,
            cooldownPeriod: this.cooldownPeriod,
        });
    }

    private transitionToHalfOpen(provider: string, state: BreakerState) {
        state.state = 'HALF_OPEN';
        state.successes = 0; // reset successes for validation
        structuredLogger.info('circuit_half_open', {
            eventType: 'circuit_breaker_transition',
            provider,
        });
    }

    private transitionToClosed(provider: string, state: BreakerState) {
        state.state = 'CLOSED';
        state.failures = 0;
        state.successes = 0;
        state.nextAttempt = null;
        structuredLogger.info('circuit_closed', {
            eventType: 'circuit_breaker_transition',
            provider,
        });
    }

    recordSuccess(provider: string) {
        const state = this.getState(provider);
        if (state.state === 'HALF_OPEN') {
            state.successes += 1;
            if (state.successes >= this.successThreshold) {
                this.transitionToClosed(provider, state);
            }
        } else if (state.state === 'CLOSED' && state.failures > 0) {
            state.failures = 0;
        }
    }

    recordFailure(provider: string) {
        const state = this.getState(provider);
        if (state.state === 'HALF_OPEN') {
            this.transitionToOpen(provider, state);
        } else if (state.state === 'CLOSED') {
            state.failures += 1;
            if (state.failures >= this.failureThreshold) {
                this.transitionToOpen(provider, state);
            }
        }
    }

    async execute<T>(provider: string, asyncFn: () => Promise<T>): Promise<T> {
        const state = this.getState(provider);

        if (state.state === 'OPEN') {
            if (state.nextAttempt && Date.now() >= state.nextAttempt) {
                this.transitionToHalfOpen(provider, state);
            } else {
                throw new CircuitOpenError(provider);
            }
        }

        try {
            const result = await asyncFn();
            this.recordSuccess(provider);
            return result;
        } catch (error) {
            this.recordFailure(provider);
            throw error;
        }
    }

    // Explicitly reset a provider's state (useful for tests)
    reset(provider: string) {
        this.states.delete(provider);
    }
}

// Global instance of the circuit breaker
export const globalCircuitBreaker = new CircuitBreaker();

/**
 * Creates a Proxy proxying all method calls on `client`.
 * If a method returns a Promise, it runs through the circuit breaker.
 * Non-promise returns or non-function properties are passed through directly.
 */
export function withCircuitBreaker<T extends object>(
    providerName: string,
    client: T,
    config?: CircuitBreakerConfig
): T {
    const breaker = config ? new CircuitBreaker(config) : globalCircuitBreaker;

    return new Proxy(client, {
        get(target, prop, receiver) {
            const original = Reflect.get(target, prop, receiver);

            if (typeof original === 'function') {
                return function (...args: any[]) {
                    // We don't know if the function returns a Promise until we call it.
                    // If it throws synchronously, we just let it throw.
                    // The circuit breaker is designed for async integration boundaries.

                    try {
                        const result = original.apply(target, args);

                        if (result && typeof result.then === 'function') {
                            return result.then(
                                (res: any) => {
                                    breaker.recordSuccess(providerName);
                                    return res;
                                },
                                (err: any) => {
                                    breaker.recordFailure(providerName);
                                    throw err;
                                }
                            );
                        }

                        // If it's not a Promise, just return it directly (synchronous logic)
                        return result;
                    } catch (e) {
                        // Synchronous throw — we don't track synchronous validation errors in the circuit breaker,
                        // but if we wanted to, we could. For integrations, network errors are async.
                        throw e;
                    }
                };
            }

            return original;
        }
    });
}
