import { structuredLogger } from '../log/logger';
import { tenantIncidentsRepository } from '../repositories/tenant-incidents.repository';

interface BreakerState {
    failures: number;
    openedAt: number | null;
}

const FAILURE_THRESHOLD = 5;
const OPEN_DURATION_MS = 5 * 60 * 1000; // 5 minutes

class CircuitBreaker {
    private states = new Map<string, BreakerState>();

    private getStateKey(tenantId: string, provider: string) {
        return `${tenantId}:${provider}`;
    }

    public isOpen(tenantId: string, provider: string): boolean {
        const key = this.getStateKey(tenantId, provider);
        const state = this.states.get(key);

        if (!state || !state.openedAt) return false;

        if (Date.now() > state.openedAt + OPEN_DURATION_MS) {
            // Half-open / Reset
            this.states.set(key, { failures: 0, openedAt: null });
            structuredLogger.info('circuit_breaker_closed', { tenantId, provider });
            return false;
        }

        return true;
    }

    public async recordFailure(tenantId: string, provider: string) {
        const key = this.getStateKey(tenantId, provider);
        const state = this.states.get(key) || { failures: 0, openedAt: null };

        if (state.openedAt) return; // Already open

        state.failures += 1;
        this.states.set(key, state);

        if (state.failures >= FAILURE_THRESHOLD) {
            state.openedAt = Date.now();
            this.states.set(key, state);

            structuredLogger.error('circuit_breaker_opened', {
                tenantId, provider, failures: state.failures
            });

            // Log incident
            await tenantIncidentsRepository.logIncident({
                tenantId,
                type: 'circuit_breaker',
                startedAt: new Date(),
                triggeredBy: `circuit-breaker-${provider}`,
                metadata: { provider, threshold: FAILURE_THRESHOLD }
            }).catch(err => {
                structuredLogger.error('failed_to_log_incident', { error: err });
            });
        }
    }

    public recordSuccess(tenantId: string, provider: string) {
        const key = this.getStateKey(tenantId, provider);
        const state = this.states.get(key);
        if (state && state.failures > 0) {
            this.states.set(key, { failures: 0, openedAt: null });
        }
    }

    public getStatus() {
        const status: any[] = [];
        for (const [key, state] of this.states.entries()) {
            if (state.openedAt && Date.now() <= state.openedAt + OPEN_DURATION_MS) {
                const [tenantId, provider] = key.split(':');
                status.push({ tenantId, provider, openedAt: new Date(state.openedAt).toISOString() });
            }
        }
        return status;
    }
}

export const circuitBreaker = new CircuitBreaker();
