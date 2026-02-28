import { describe, it, expect, vi, beforeEach } from 'vitest';
import { circuitBreaker } from '../../../infra/security/circuit-breaker';

describe('CircuitBreaker (Provider Level)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // Reset state for tests
        (circuitBreaker as any).states.clear();
    });

    it('should stay closed under failure threshold', async () => {
        expect(circuitBreaker.isOpen('tenant-a', 'provider-x')).toBe(false);

        await circuitBreaker.recordFailure('tenant-a', 'provider-x');
        await circuitBreaker.recordFailure('tenant-a', 'provider-x');
        await circuitBreaker.recordFailure('tenant-a', 'provider-x');

        expect(circuitBreaker.isOpen('tenant-a', 'provider-x')).toBe(false);
    });

    it('should open upon reaching failure threshold', async () => {
        for (let i = 0; i < 5; i++) {
            await circuitBreaker.recordFailure('tenant-b', 'provider-y');
        }

        expect(circuitBreaker.isOpen('tenant-b', 'provider-y')).toBe(true);
        const status = circuitBreaker.getStatus();
        expect(status).toHaveLength(1);
        expect(status[0].tenantId).toBe('tenant-b');
        expect(status[0].provider).toBe('provider-y');
    });

    it('should reset failure count upon success', async () => {
        await circuitBreaker.recordFailure('tenant-c', 'provider-z');
        expect((circuitBreaker as any).states.get('tenant-c:provider-z').failures).toBe(1);

        circuitBreaker.recordSuccess('tenant-c', 'provider-z');
        expect((circuitBreaker as any).states.get('tenant-c:provider-z').failures).toBe(0);
    });

    it('should half-open/reset after duration expires', async () => {
        for (let i = 0; i < 5; i++) {
            await circuitBreaker.recordFailure('tenant-d', 'provider-w');
        }

        expect(circuitBreaker.isOpen('tenant-d', 'provider-w')).toBe(true);

        // Advance 5 minutes + 1 second
        vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

        // First call should close the breaker and return false
        expect(circuitBreaker.isOpen('tenant-d', 'provider-w')).toBe(false);
    });
});
