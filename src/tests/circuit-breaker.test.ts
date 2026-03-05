import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker, withCircuitBreaker } from '../lib/resilience/circuit-breaker';
import { CircuitOpenError } from '../lib/resilience/errors';

describe('Circuit Breaker Resilience', () => {

    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('executes successfully and stays CLOSED', async () => {
        const breaker = new CircuitBreaker({ failureThreshold: 2 });
        const mockFn = vi.fn().mockResolvedValue('success');

        const result = await breaker.execute('test_provider', mockFn);

        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('falhas consecutivas -> OPEN', async () => {
        const breaker = new CircuitBreaker({ failureThreshold: 3, cooldownPeriod: 10000 });
        const mockFn = vi.fn().mockRejectedValue(new Error('API Down'));

        await expect(breaker.execute('test_provider', mockFn)).rejects.toThrow('API Down');
        await expect(breaker.execute('test_provider', mockFn)).rejects.toThrow('API Down');
        await expect(breaker.execute('test_provider', mockFn)).rejects.toThrow('API Down');

        // Fourth call should throw CircuitOpenError immediately without calling mockFn
        mockFn.mockClear();
        await expect(breaker.execute('test_provider', mockFn)).rejects.toThrow(CircuitOpenError);
        expect(mockFn).not.toHaveBeenCalled();
    });

    it('cooldown -> HALF_OPEN, then SUCCESS -> CLOSED', async () => {
        const breaker = new CircuitBreaker({ failureThreshold: 2, cooldownPeriod: 5000, successThreshold: 2 });
        let shouldFail = true;

        const mockFn = vi.fn().mockImplementation(async () => {
            if (shouldFail) throw new Error('API Down');
            return 'OK';
        });

        // Trigger OPEN
        await expect(breaker.execute('test_provider', mockFn)).rejects.toThrow();
        await expect(breaker.execute('test_provider', mockFn)).rejects.toThrow();

        // At OPEN state
        await expect(breaker.execute('test_provider', mockFn)).rejects.toThrow(CircuitOpenError);

        // Advance time to pass cooldown (5000ms)
        vi.advanceTimersByTime(5001);

        // Now in HALF-OPEN state. Let's make it succeed.
        shouldFail = false;
        mockFn.mockClear();

        // 1st success
        await expect(breaker.execute('test_provider', mockFn)).resolves.toBe('OK');

        // 2nd success (reaches threshold of 2) -> Transitions to CLOSED
        await expect(breaker.execute('test_provider', mockFn)).resolves.toBe('OK');

        // Validate it's fully closed by forcing a single failure (should NOT open circuit, as threshold is 2)
        shouldFail = true;
        await expect(breaker.execute('test_provider', mockFn)).rejects.toThrow('API Down');
        shouldFail = false;
        // Should still execute since failure count is 1
        await expect(breaker.execute('test_provider', mockFn)).resolves.toBe('OK');
    });

    it('cooldown -> HALF_OPEN, then FAILURE -> OPEN', async () => {
        const breaker = new CircuitBreaker({ failureThreshold: 2, cooldownPeriod: 5000 });
        const mockFn = vi.fn().mockRejectedValue(new Error('API Still Down'));

        // Trigger OPEN
        await expect(breaker.execute('test_provider', mockFn)).rejects.toThrow();
        await expect(breaker.execute('test_provider', mockFn)).rejects.toThrow();

        // Advance time to pass cooldown
        vi.advanceTimersByTime(5001);

        // In HALF-OPEN state, any single failure trips it back to OPEN immediately
        mockFn.mockClear();
        await expect(breaker.execute('test_provider', mockFn)).rejects.toThrow('API Still Down');
        expect(mockFn).toHaveBeenCalledTimes(1);

        // Next call should be CircuitOpenError again
        mockFn.mockClear();
        await expect(breaker.execute('test_provider', mockFn)).rejects.toThrow(CircuitOpenError);
        expect(mockFn).not.toHaveBeenCalled();
    });

});
