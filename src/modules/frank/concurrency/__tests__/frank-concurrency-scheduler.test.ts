import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FrankConcurrencyScheduler } from '../frank-concurrency-scheduler';
import { frankToolRegistry } from '../../tools/frank-tool.registry';
import { z } from 'zod';

describe('FrankConcurrencyScheduler (FRANK-006)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    // Register test tool contracts before running tests
    const registerDelayTool = (name: string, delayMs: number = 20) => {
        frankToolRegistry.registerTool({
            name,
            description: 'Test tool with controlled delay',
            inputSchema: z.object({
                tenantId: z.string(),
                val: z.string().optional(),
                shouldFail: z.boolean().optional(),
            }),
            outputSchema: z.object({
                success: z.boolean(),
                value: z.string().optional(),
            }),
            isReadOnly: true,
            riskClass: 'SAFE',
            capabilities: ['READ'],
            sideEffects: ['NONE'],
            execute: async (input, context) => {
                if (input.shouldFail) {
                    throw new Error('Simulated tool failure');
                }
                if (context.abortSignal?.aborted) {
                    throw new Error(`Aborted: ${context.abortSignal.reason}`);
                }

                await new Promise<void>((resolve, reject) => {
                    const timer = setTimeout(() => resolve(), delayMs);
                    if (context.abortSignal) {
                        context.abortSignal.addEventListener('abort', () => {
                            clearTimeout(timer);
                            reject(new Error(`Aborted during execution: ${context.abortSignal?.reason}`));
                        }, { once: true });
                    }
                });

                return { success: true, value: input.val || 'ok' };
            },
        });
    };

    registerDelayTool('scheduler_delay_tool', 30);
    registerDelayTool('scheduler_fast_tool', 5);

    it('1. Enforces maximum global concurrency limit', async () => {
        const scheduler = new FrankConcurrencyScheduler({
            maxGlobalConcurrency: 2,
            maxTenantConcurrency: 10,
        });

        let activeSimultaneous = 0;
        let maxActiveObserved = 0;

        frankToolRegistry.registerTool({
            name: 'concurrency_limit_tool',
            description: 'Tracking active count',
            inputSchema: z.object({ tenantId: z.string() }),
            outputSchema: z.object({ ok: z.boolean() }),
            isReadOnly: true,
            riskClass: 'SAFE',
            capabilities: ['READ'],
            sideEffects: ['NONE'],
            execute: async () => {
                activeSimultaneous++;
                maxActiveObserved = Math.max(maxActiveObserved, activeSimultaneous);
                await new Promise(r => setTimeout(r, 25));
                activeSimultaneous--;
                return { ok: true };
            },
        });

        const handles = Array.from({ length: 5 }, (_, i) =>
            scheduler.scheduleToolExecution({
                tenantId: `tenant_${i}`,
                toolName: 'concurrency_limit_tool',
                input: { tenantId: `tenant_${i}` },
            })
        );

        await Promise.all(handles.map(h => h.promise));

        expect(maxActiveObserved).toBeLessThanOrEqual(2);
        expect(scheduler.getSnapshot().activeGlobalCount).toBe(0);
    });

    it('2. Enforces per-tenant max concurrency limit', async () => {
        const scheduler = new FrankConcurrencyScheduler({
            maxGlobalConcurrency: 10,
            maxTenantConcurrency: 2,
        });

        let tenantAActive = 0;
        let maxTenantAObserved = 0;

        frankToolRegistry.registerTool({
            name: 'tenant_concurrency_tool',
            description: 'Tracking tenant active count',
            inputSchema: z.object({ tenantId: z.string() }),
            outputSchema: z.object({ ok: z.boolean() }),
            isReadOnly: true,
            riskClass: 'SAFE',
            capabilities: ['READ'],
            sideEffects: ['NONE'],
            execute: async (input) => {
                if (input.tenantId === 'tenant_A') {
                    tenantAActive++;
                    maxTenantAObserved = Math.max(maxTenantAObserved, tenantAActive);
                    await new Promise(r => setTimeout(r, 30));
                    tenantAActive--;
                }
                return { ok: true };
            },
        });

        const handlesA = Array.from({ length: 5 }, () =>
            scheduler.scheduleToolExecution({
                tenantId: 'tenant_A',
                toolName: 'tenant_concurrency_tool',
                input: { tenantId: 'tenant_A' },
            })
        );

        const handlesB = Array.from({ length: 2 }, () =>
            scheduler.scheduleToolExecution({
                tenantId: 'tenant_B',
                toolName: 'tenant_concurrency_tool',
                input: { tenantId: 'tenant_B' },
            })
        );

        await Promise.all([...handlesA, ...handlesB].map(h => h.promise));

        expect(maxTenantAObserved).toBeLessThanOrEqual(2);
    });

    it('3. Guarantees deterministic priority execution order', async () => {
        const scheduler = new FrankConcurrencyScheduler({
            maxGlobalConcurrency: 1, // Serial execution to test queue ordering
            maxTenantConcurrency: 1,
        });

        const executionOrder: string[] = [];

        frankToolRegistry.registerTool({
            name: 'priority_order_tool',
            description: 'Records order of execution',
            inputSchema: z.object({ tenantId: z.string(), id: z.string() }),
            outputSchema: z.object({ ok: z.boolean() }),
            isReadOnly: true,
            riskClass: 'SAFE',
            capabilities: ['READ'],
            sideEffects: ['NONE'],
            execute: async (input) => {
                executionOrder.push(input.id);
                await new Promise(r => setTimeout(r, 20));
                return { ok: true };
            },
        });

        // Block the single slot with a blocker task first
        const h0 = scheduler.scheduleToolExecution({
            tenantId: 'tenant_1',
            toolName: 'priority_order_tool',
            input: { tenantId: 'tenant_1', id: 'blocker' },
            priority: 'MEDIUM',
        });

        // Ensure blocker starts running before enqueuing queued items
        await new Promise(r => setTimeout(r, 5));

        // While blocker is running, enqueue LOW, HIGH, MEDIUM
        const hLow = scheduler.scheduleToolExecution({
            tenantId: 'tenant_1',
            toolName: 'priority_order_tool',
            input: { tenantId: 'tenant_1', id: 'LOW_TASK' },
            priority: 'LOW',
        });

        const hHigh = scheduler.scheduleToolExecution({
            tenantId: 'tenant_1',
            toolName: 'priority_order_tool',
            input: { tenantId: 'tenant_1', id: 'HIGH_TASK' },
            priority: 'HIGH',
        });

        const hMed = scheduler.scheduleToolExecution({
            tenantId: 'tenant_1',
            toolName: 'priority_order_tool',
            input: { tenantId: 'tenant_1', id: 'MED_TASK' },
            priority: 'MEDIUM',
        });

        await Promise.all([h0.promise, hLow.promise, hHigh.promise, hMed.promise]);

        expect(executionOrder).toEqual(['blocker', 'HIGH_TASK', 'MED_TASK', 'LOW_TASK']);
    });

    it('4. Ensures fairness between active tenants via Round-Robin dispatching', async () => {
        const scheduler = new FrankConcurrencyScheduler({
            maxGlobalConcurrency: 1, // Force serial dispatch
            maxTenantConcurrency: 10,
        });

        const executedTenants: string[] = [];

        frankToolRegistry.registerTool({
            name: 'fairness_tool',
            description: 'Tracks tenant round robin',
            inputSchema: z.object({ tenantId: z.string() }),
            outputSchema: z.object({ ok: z.boolean() }),
            isReadOnly: true,
            riskClass: 'SAFE',
            capabilities: ['READ'],
            sideEffects: ['NONE'],
            execute: async (input) => {
                executedTenants.push(input.tenantId);
                await new Promise(r => setTimeout(r, 10));
                return { ok: true };
            },
        });

        // Blocker task to allow queue buildup
        const hBlocker = scheduler.scheduleToolExecution({
            tenantId: 'tenant_alpha',
            toolName: 'fairness_tool',
            input: { tenantId: 'tenant_alpha' },
        });

        await new Promise(r => setTimeout(r, 3));

        // Enqueue 3 tasks for tenant_alpha and 3 tasks for tenant_beta
        const handlesAlpha = Array.from({ length: 3 }, () =>
            scheduler.scheduleToolExecution({
                tenantId: 'tenant_alpha',
                toolName: 'fairness_tool',
                input: { tenantId: 'tenant_alpha' },
            })
        );

        const handlesBeta = Array.from({ length: 3 }, () =>
            scheduler.scheduleToolExecution({
                tenantId: 'tenant_beta',
                toolName: 'fairness_tool',
                input: { tenantId: 'tenant_beta' },
            })
        );

        await Promise.all([hBlocker.promise, ...handlesAlpha.map(h => h.promise), ...handlesBeta.map(h => h.promise)]);

        const subsequentTenants = executedTenants.slice(1);
        expect(subsequentTenants).toEqual([
            'tenant_beta',
            'tenant_alpha',
            'tenant_beta',
            'tenant_alpha',
            'tenant_beta',
            'tenant_alpha',
        ]);
    });

    it('5. Anti-starvation aging mechanism boosts waiting tasks over time', async () => {
        const scheduler = new FrankConcurrencyScheduler({
            maxGlobalConcurrency: 1,
            maxTenantConcurrency: 1,
            agingIntervalMs: 50,  // Fast aging for test
            agingBoostAmount: 25, // Gain +25 score per aging interval
        });

        const executionOrder: string[] = [];

        frankToolRegistry.registerTool({
            name: 'aging_test_tool',
            description: 'Test aging mechanism',
            inputSchema: z.object({ tenantId: z.string(), id: z.string() }),
            outputSchema: z.object({ ok: z.boolean() }),
            isReadOnly: true,
            riskClass: 'SAFE',
            capabilities: ['READ'],
            sideEffects: ['NONE'],
            execute: async (input) => {
                executionOrder.push(input.id);
                await new Promise(r => setTimeout(r, 120));
                return { ok: true };
            },
        });

        // 1. Blocker task
        const hBlock = scheduler.scheduleToolExecution({
            tenantId: 'tenant_1',
            toolName: 'aging_test_tool',
            input: { tenantId: 'tenant_1', id: 'blocker' },
            priority: 'MEDIUM',
        });

        await new Promise(r => setTimeout(r, 5));

        // 2. Enqueue LOW priority task (base score 10)
        const hLow = scheduler.scheduleToolExecution({
            tenantId: 'tenant_1',
            toolName: 'aging_test_tool',
            input: { tenantId: 'tenant_1', id: 'OLD_LOW_TASK' },
            priority: 'LOW',
        });

        // Wait 100ms so OLD_LOW_TASK ages by 2 intervals (+50 score => effective score 60)
        await new Promise(r => setTimeout(r, 100));

        // 3. Enqueue new HIGH priority task (base score 30)
        const hHigh = scheduler.scheduleToolExecution({
            tenantId: 'tenant_1',
            toolName: 'aging_test_tool',
            input: { tenantId: 'tenant_1', id: 'NEW_HIGH_TASK' },
            priority: 'HIGH',
        });

        await Promise.all([hBlock.promise, hLow.promise, hHigh.promise]);

        expect(executionOrder).toEqual(['blocker', 'OLD_LOW_TASK', 'NEW_HIGH_TASK']);
    });

    it('6. Strict Tenant Isolation - prevents tenant context cross-contamination', async () => {
        const scheduler = new FrankConcurrencyScheduler();

        const hA = scheduler.scheduleToolExecution({
            tenantId: 'tenant_SEC_A',
            toolName: 'scheduler_fast_tool',
            input: { tenantId: 'tenant_SEC_A', val: 'secret_A' },
        });

        const hB = scheduler.scheduleToolExecution({
            tenantId: 'tenant_SEC_B',
            toolName: 'scheduler_fast_tool',
            input: { tenantId: 'tenant_SEC_B', val: 'secret_B' },
        });

        const [resA, resB] = await Promise.all([hA.promise, hB.promise]);

        expect(resA.ok).toBe(true);
        expect(resA.metadata.tenantId).toBe('tenant_SEC_A');
        expect(resA.data).toEqual({ success: true, value: 'secret_A' });

        expect(resB.ok).toBe(true);
        expect(resB.metadata.tenantId).toBe('tenant_SEC_B');
        expect(resB.data).toEqual({ success: true, value: 'secret_B' });

        const snapshot = scheduler.getSnapshot();
        expect(snapshot.tenantMetrics['tenant_SEC_A'].completedCount).toBe(1);
        expect(snapshot.tenantMetrics['tenant_SEC_B'].completedCount).toBe(1);
    });

    it('7. Cancellation before execution (queued state)', async () => {
        const scheduler = new FrankConcurrencyScheduler({
            maxGlobalConcurrency: 1, // Force serial execution
            maxTenantConcurrency: 1,
        });

        // Blocker task
        const hBlock = scheduler.scheduleToolExecution({
            tenantId: 'tenant_1',
            toolName: 'scheduler_delay_tool',
            input: { tenantId: 'tenant_1' },
        });

        // Queued task to be cancelled
        const hToCancel = scheduler.scheduleToolExecution({
            tenantId: 'tenant_1',
            toolName: 'scheduler_fast_tool',
            input: { tenantId: 'tenant_1' },
        });

        expect(hToCancel.status).toBe('QUEUED');

        // Cancel while queued
        const cancelledSuccess = hToCancel.cancel('Operator requested cancellation');
        expect(cancelledSuccess).toBe(true);
        expect(hToCancel.status).toBe('CANCELLED');

        const cancelResult = await hToCancel.promise;
        expect(cancelResult.ok).toBe(false);
        expect(cancelResult.error?.code).toBe('CANCELLED');

        await hBlock.promise;
        const snapshot = scheduler.getSnapshot();
        expect(snapshot.tenantMetrics['tenant_1'].cancelledCount).toBe(1);
    });

    it('8. Cancellation during execution propagates AbortSignal to tool', async () => {
        const scheduler = new FrankConcurrencyScheduler({
            maxGlobalConcurrency: 2,
        });

        const handle = scheduler.scheduleToolExecution({
            tenantId: 'tenant_abort_test',
            toolName: 'scheduler_delay_tool',
            input: { tenantId: 'tenant_abort_test' },
        });

        await new Promise(r => setTimeout(r, 10));
        expect(handle.status).toBe('RUNNING');

        const cancelResult = handle.cancel('Aborting active execution');
        expect(cancelResult).toBe(true);

        const result = await handle.promise;
        expect(result.ok).toBe(false);
        expect(result.status).toBe('EXECUTION_FAILED');
        expect(result.error?.message).toMatch(/Aborted during execution/);
    });

    it('9. External AbortSignal triggers task cancellation automatically', async () => {
        const scheduler = new FrankConcurrencyScheduler({
            maxGlobalConcurrency: 1,
        });

        const abortController = new AbortController();

        // Blocker
        scheduler.scheduleToolExecution({
            tenantId: 'tenant_ext',
            toolName: 'scheduler_delay_tool',
            input: { tenantId: 'tenant_ext' },
        });

        // Task attached to external abortController
        const hExt = scheduler.scheduleToolExecution({
            tenantId: 'tenant_ext',
            toolName: 'scheduler_fast_tool',
            input: { tenantId: 'tenant_ext' },
            abortSignal: abortController.signal,
        });

        abortController.abort('External controller aborted');

        const res = await hExt.promise;
        expect(res.ok).toBe(false);
        expect(res.error?.code).toBe('CANCELLED');
        expect(res.error?.message).toMatch(/External controller aborted/);
    });

    it('10. Single task failure does NOT corrupt scheduler or stop subsequent tasks', async () => {
        const scheduler = new FrankConcurrencyScheduler({
            maxGlobalConcurrency: 1,
        });

        const hFail = scheduler.scheduleToolExecution({
            tenantId: 'tenant_err',
            toolName: 'scheduler_fast_tool',
            input: { tenantId: 'tenant_err', shouldFail: true },
        });

        const hPass = scheduler.scheduleToolExecution({
            tenantId: 'tenant_err',
            toolName: 'scheduler_fast_tool',
            input: { tenantId: 'tenant_err', val: 'success_after_failure' },
        });

        const resFail = await hFail.promise;
        expect(resFail.ok).toBe(false);
        expect(resFail.status).toBe('EXECUTION_FAILED');

        const resPass = await hPass.promise;
        expect(resPass.ok).toBe(true);
        expect(resPass.data).toEqual({ success: true, value: 'success_after_failure' });

        const snapshot = scheduler.getSnapshot();
        expect(snapshot.tenantMetrics['tenant_err'].failedCount).toBe(1);
        expect(snapshot.tenantMetrics['tenant_err'].completedCount).toBe(1);
    });

    it('11. Backpressure Rejection when queue capacity is saturated', async () => {
        const scheduler = new FrankConcurrencyScheduler({
            maxGlobalConcurrency: 1,
            maxGlobalQueueSize: 2,
            maxTenantQueueSize: 2,
        });

        // Blocker task (active, count=1)
        scheduler.scheduleToolExecution({
            tenantId: 'tenant_sat',
            toolName: 'scheduler_delay_tool',
            input: { tenantId: 'tenant_sat' },
        });

        await new Promise(r => setTimeout(r, 5));

        // 2 queued tasks (filling queue size 2)
        const q1 = scheduler.scheduleToolExecution({
            tenantId: 'tenant_sat',
            toolName: 'scheduler_fast_tool',
            input: { tenantId: 'tenant_sat' },
        });

        const q2 = scheduler.scheduleToolExecution({
            tenantId: 'tenant_sat',
            toolName: 'scheduler_fast_tool',
            input: { tenantId: 'tenant_sat' },
        });

        expect(q1.status).toBe('QUEUED');
        expect(q2.status).toBe('QUEUED');

        // 3rd task should be REJECTED immediately due to capacity limit
        const hOverflow = scheduler.scheduleToolExecution({
            tenantId: 'tenant_sat',
            toolName: 'scheduler_fast_tool',
            input: { tenantId: 'tenant_sat' },
        });

        expect(hOverflow.status).toBe('REJECTED');

        const result = await hOverflow.promise;
        expect(result.ok).toBe(false);
        expect(result.status).toBe('POLICY_BLOCKED');
        expect(result.error?.code).toBe('QUEUE_SATURATED');

        const snapshot = scheduler.getSnapshot();
        expect(snapshot.tenantMetrics['tenant_sat'].rejectedCount).toBe(1);
    });

    it('12. Burst pressure / Race conditions - single execution guarantee', async () => {
        const scheduler = new FrankConcurrencyScheduler({
            maxGlobalConcurrency: 5,
            maxTenantConcurrency: 5,
        });

        let executionCounts = 0;

        frankToolRegistry.registerTool({
            name: 'single_execution_tool',
            description: 'Verifies single execution per task',
            inputSchema: z.object({ tenantId: z.string() }),
            outputSchema: z.object({ ok: z.boolean() }),
            isReadOnly: true,
            riskClass: 'SAFE',
            capabilities: ['READ'],
            sideEffects: ['NONE'],
            execute: async () => {
                executionCounts++;
                return { ok: true };
            },
        });

        const handles = Array.from({ length: 20 }, (_, i) =>
            scheduler.scheduleToolExecution({
                tenantId: `tenant_${i % 4}`,
                toolName: 'single_execution_tool',
                input: { tenantId: `tenant_${i % 4}` },
            })
        );

        const results = await Promise.all(handles.map(h => h.promise));

        expect(results.length).toBe(20);
        expect(results.every(r => r.ok)).toBe(true);
        expect(executionCounts).toBe(20);
    });

    it('13. Observability snapshot reflects active state, queues, and metrics accurately', async () => {
        const scheduler = new FrankConcurrencyScheduler({
            maxGlobalConcurrency: 1,
        });

        const initialSnapshot = scheduler.getSnapshot();
        expect(initialSnapshot.activeGlobalCount).toBe(0);
        expect(initialSnapshot.queuedGlobalCount).toBe(0);

        const h1 = scheduler.scheduleToolExecution({
            tenantId: 'tenant_obs',
            toolName: 'scheduler_delay_tool',
            input: { tenantId: 'tenant_obs' },
        });

        await new Promise(r => setTimeout(r, 5));

        const h2 = scheduler.scheduleToolExecution({
            tenantId: 'tenant_obs',
            toolName: 'scheduler_fast_tool',
            input: { tenantId: 'tenant_obs' },
            priority: 'HIGH',
        });

        const midSnapshot = scheduler.getSnapshot();
        expect(midSnapshot.activeGlobalCount).toBe(1);
        expect(midSnapshot.queuedGlobalCount).toBe(1);
        expect(midSnapshot.runningTasksSummary.length).toBe(1);
        expect(midSnapshot.queuedTasksSummary.length).toBe(1);
        expect(midSnapshot.queuedTasksSummary[0].priority).toBe('HIGH');

        await Promise.all([h1.promise, h2.promise]);

        const finalSnapshot = scheduler.getSnapshot();
        expect(finalSnapshot.activeGlobalCount).toBe(0);
        expect(finalSnapshot.queuedGlobalCount).toBe(0);
        expect(finalSnapshot.tenantMetrics['tenant_obs'].completedCount).toBe(2);
    });

    it('14. Complete Integration with Frank Execution Runtime - preserves FRANK-001..005 contracts', async () => {
        const scheduler = new FrankConcurrencyScheduler();

        frankToolRegistry.registerTool({
            name: 'mock_freight_calculation',
            description: 'Mock freight calculation for scheduler integration test',
            inputSchema: z.object({
                tenantId: z.string(),
                productId: z.string(),
                quantity: z.number(),
                destinationZip: z.string(),
            }),
            outputSchema: z.object({
                quoteId: z.string(),
                price: z.number(),
            }),
            isReadOnly: true,
            riskClass: 'SAFE',
            capabilities: ['READ', 'QUERY'],
            sideEffects: ['NONE'],
            execute: async () => {
                return { quoteId: 'quote_999', price: 42.50 };
            },
        });

        const handle = scheduler.scheduleToolExecution({
            tenantId: 'tenant_runtime_int',
            toolName: 'mock_freight_calculation',
            input: {
                tenantId: 'tenant_runtime_int',
                productId: 'prod_123',
                quantity: 10,
                destinationZip: '01001-000',
            },
        });

        const result = await handle.promise;

        expect(result.ok).toBe(true);
        expect(result.action).toBe('mock_freight_calculation');
        expect(result.metadata.capabilities).toContain('READ');
        expect(result.metadata.sideEffects).toContain('NONE');
        expect(result.data).toEqual({ quoteId: 'quote_999', price: 42.50 });
        expect(result.evidence).not.toBeNull();
        expect(result.evidence?.toolName).toBe('mock_freight_calculation');
    });
});
