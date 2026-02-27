import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentRuntimeGuard } from '../AgentRuntimeGuard';
import { AgentLoopGuardError } from '../AgentLoopGuardError';

describe('AgentRuntimeGuard', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('test_max_iterations_abort', async () => {
        const guard = new AgentRuntimeGuard('tenant-1', 'req-1');
        const spy = vi.spyOn(guard as any, 'logViolation').mockResolvedValue(undefined as never);

        // Default max iterations is 5
        for (let i = 0; i < 5; i++) {
            await guard.incrementIteration();
        }

        // 6th iteration should throw
        let error: Error | undefined;
        try {
            await guard.incrementIteration();
        } catch (e: any) {
            error = e;
        }

        expect(error).toBeInstanceOf(AgentLoopGuardError);
        expect(error?.message).toContain('Max iterations exceeded');
        expect(spy).toHaveBeenCalled();
    });

    it('test_max_tool_calls_abort', async () => {
        const guard = new AgentRuntimeGuard('tenant-1', 'req-2');
        const spy = vi.spyOn(guard as any, 'logViolation').mockResolvedValue(undefined as never);

        // Default max calls is 10
        for (let i = 0; i < 10; i++) {
            await guard.incrementToolCall();
        }

        // 11th call should throw
        let error: Error | undefined;
        try {
            await guard.incrementToolCall();
        } catch (e: any) {
            error = e;
        }

        expect(error).toBeInstanceOf(AgentLoopGuardError);
        expect(error?.message).toContain('Max tool calls exceeded');
        expect(spy).toHaveBeenCalled();
    });

    it('test_timeout_abort', async () => {
        const guard = new AgentRuntimeGuard('tenant-1', 'req-3');
        const spy = vi.spyOn(guard as any, 'logViolation').mockResolvedValue(undefined as never);

        // Fast forward exactly 25 seconds
        vi.advanceTimersByTime(25000);
        // Should pass
        await expect(guard.assertLimits()).resolves.toBeUndefined();

        // Fast forward 1 more ms to breach the 25000ms limit
        vi.advanceTimersByTime(1);

        let error: Error | undefined;
        try {
            await guard.assertLimits();
        } catch (e: any) {
            error = e;
        }

        expect(error).toBeInstanceOf(AgentLoopGuardError);
        expect(error?.message).toContain('Max execution time exceeded');
        expect(spy).toHaveBeenCalled();
    });
});
