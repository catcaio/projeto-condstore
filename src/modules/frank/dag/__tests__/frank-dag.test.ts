import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { frankToolRegistry } from '../../tools/frank-tool.registry';
import { FrankDagValidator, FrankDagValidationError } from '../frank-dag-validator';
import { frankDagStateService } from '../frank-dag-state.service';
import { frankDagEngine } from '../frank-dag-engine';
import { FrankDagPlanInput } from '../frank-dag.types';

describe('Frank Dependency-aware Task DAG (FRANK-007)', () => {
    const TENANT_A = 'tenant_dag_alpha';
    const TENANT_B = 'tenant_dag_beta';

    beforeEach(() => {
        frankDagStateService.resetMemoryStore();

        // Register dummy test tools in FrankToolRegistry if not already registered
        if (!frankToolRegistry.hasTool('dag_test_fast_tool')) {
            frankToolRegistry.registerTool({
                name: 'dag_test_fast_tool',
                description: 'Fast execution tool for DAG testing',
                inputSchema: z.object({
                    tenantId: z.string().min(1),
                    value: z.any().optional(),
                }),
                outputSchema: z.object({ success: z.boolean(), echo: z.any() }),
                isReadOnly: true,
                riskClass: 'SAFE',
                capabilities: ['READ'],
                sideEffects: ['NONE'],
                execute: async (input) => ({ success: true, echo: (input as any).value ?? 'ok' }),
            });
        }

        if (!frankToolRegistry.hasTool('dag_test_delay_tool')) {
            frankToolRegistry.registerTool({
                name: 'dag_test_delay_tool',
                description: 'Delayed tool for DAG testing concurrency and blocking state',
                inputSchema: z.object({
                    tenantId: z.string().min(1),
                    delayMs: z.number().default(30),
                }),
                outputSchema: z.object({ success: z.boolean() }),
                isReadOnly: true,
                riskClass: 'SAFE',
                capabilities: ['READ'],
                sideEffects: ['NONE'],
                execute: async (input) => {
                    const delay = (input as any).delayMs || 30;
                    await new Promise(r => setTimeout(r, delay));
                    return { success: true };
                },
            });
        }

        if (!frankToolRegistry.hasTool('dag_test_fail_tool')) {
            frankToolRegistry.registerTool({
                name: 'dag_test_fail_tool',
                description: 'Failing tool for testing error propagation in DAG',
                inputSchema: z.object({
                    tenantId: z.string().min(1),
                    errorMsg: z.string().optional(),
                }),
                outputSchema: z.any(),
                isReadOnly: true,
                riskClass: 'SAFE',
                capabilities: ['READ'],
                sideEffects: ['NONE'],
                execute: async (input) => {
                    throw new Error((input as any).errorMsg || 'Intentional DAG test failure');
                },
            });
        }
    });

    describe('1. Structural Validation & Cycle Detection', () => {
        it('1.1 Rejects empty DAG plan', () => {
            expect(() => {
                FrankDagValidator.validateAndNormalizePlan({
                    tenantId: TENANT_A,
                    tasks: [],
                });
            }).toThrowError(/EMPTY_DAG/);
        });

        it('1.2 Rejects plan with missing tenantId', () => {
            expect(() => {
                FrankDagValidator.validateAndNormalizePlan({
                    tenantId: '',
                    tasks: [{ taskId: 't1', toolName: 'dag_test_fast_tool', input: {} }],
                });
            }).toThrowError(/INVALID_TENANT_ID/);
        });

        it('1.3 Rejects duplicate task IDs', () => {
            expect(() => {
                FrankDagValidator.validateAndNormalizePlan({
                    tenantId: TENANT_A,
                    tasks: [
                        { taskId: 'task_1', toolName: 'dag_test_fast_tool', input: {} },
                        { taskId: 'task_1', toolName: 'dag_test_fast_tool', input: {} },
                    ],
                });
            }).toThrowError(/DUPLICATE_TASK_ID/);
        });

        it('1.4 Rejects nonexistent dependency references', () => {
            expect(() => {
                FrankDagValidator.validateAndNormalizePlan({
                    tenantId: TENANT_A,
                    tasks: [
                        { taskId: 'task_1', toolName: 'dag_test_fast_tool', input: {}, dependencies: ['nonexistent_task'] },
                    ],
                });
            }).toThrowError(/NONEXISTENT_DEPENDENCY/);
        });

        it('1.5 Rejects self-dependency', () => {
            expect(() => {
                FrankDagValidator.validateAndNormalizePlan({
                    tenantId: TENANT_A,
                    tasks: [
                        { taskId: 'task_1', toolName: 'dag_test_fast_tool', input: {}, dependencies: ['task_1'] },
                    ],
                });
            }).toThrowError(/SELF_DEPENDENCY/);
        });

        it('1.6 Deterministically detects direct cycle (A -> B -> A)', () => {
            expect(() => {
                FrankDagValidator.validateAndNormalizePlan({
                    tenantId: TENANT_A,
                    tasks: [
                        { taskId: 'task_A', toolName: 'dag_test_fast_tool', input: {}, dependencies: ['task_B'] },
                        { taskId: 'task_B', toolName: 'dag_test_fast_tool', input: {}, dependencies: ['task_A'] },
                    ],
                });
            }).toThrowError(/CYCLE_DETECTED/);
        });

        it('1.7 Deterministically detects multi-node indirect cycle (A -> B -> C -> A)', () => {
            expect(() => {
                FrankDagValidator.validateAndNormalizePlan({
                    tenantId: TENANT_A,
                    tasks: [
                        { taskId: 'task_A', toolName: 'dag_test_fast_tool', input: {}, dependencies: ['task_C'] },
                        { taskId: 'task_B', toolName: 'dag_test_fast_tool', input: {}, dependencies: ['task_A'] },
                        { taskId: 'task_C', toolName: 'dag_test_fast_tool', input: {}, dependencies: ['task_B'] },
                    ],
                });
            }).toThrowError(/CYCLE_DETECTED/);
        });

        it('1.8 Rejects cross-tenant task mismatch', () => {
            expect(() => {
                FrankDagValidator.validateAndNormalizePlan({
                    tenantId: TENANT_A,
                    tasks: [
                        { taskId: 'task_A', tenantId: TENANT_B, toolName: 'dag_test_fast_tool', input: {} },
                    ],
                });
            }).toThrowError(/CROSS_TENANT_TASK_REJECTED/);
        });

        it('1.9 Rejects cross-execution run mismatch', () => {
            expect(() => {
                FrankDagValidator.validateAndNormalizePlan({
                    tenantId: TENANT_A,
                    executionRunId: 'run_100',
                    tasks: [
                        { taskId: 'task_A', executionRunId: 'run_200', toolName: 'dag_test_fast_tool', input: {} },
                    ],
                });
            }).toThrowError(/CROSS_EXECUTION_TASK_REJECTED/);
        });
    });

    describe('2. Dependency Resolution & Execution Topology', () => {
        it('2.1 Executes linear DAG sequentially (A -> B -> C)', async () => {
            const planInput: FrankDagPlanInput = {
                tenantId: TENANT_A,
                tasks: [
                    { taskId: 'task_A', toolName: 'dag_test_fast_tool', input: { value: 'A' } },
                    { taskId: 'task_B', toolName: 'dag_test_fast_tool', input: { value: 'B' }, dependencies: ['task_A'] },
                    { taskId: 'task_C', toolName: 'dag_test_fast_tool', input: { value: 'C' }, dependencies: ['task_B'] },
                ],
            };

            const handle = await frankDagEngine.createAndExecuteDag(planInput);
            const snapshot = await handle.promise;

            expect(snapshot.status).toBe('COMPLETED');
            expect(snapshot.tasks['task_A'].status).toBe('COMPLETED');
            expect(snapshot.tasks['task_B'].status).toBe('COMPLETED');
            expect(snapshot.tasks['task_C'].status).toBe('COMPLETED');

            // Check transition history order
            const events = await frankDagStateService.getTransitionEvents(TENANT_A, snapshot.dagId);
            const completedEvents = events.filter(e => e.toStatus === 'COMPLETED');
            const completedTaskIds = completedEvents.map(e => e.taskId);

            expect(completedTaskIds).toEqual(['task_A', 'task_B', 'task_C']);
        });

        it('2.2 Executes independent branches in parallel (A -> B, C -> D)', async () => {
            const planInput: FrankDagPlanInput = {
                tenantId: TENANT_A,
                tasks: [
                    { taskId: 'branch1_A', toolName: 'dag_test_delay_tool', input: { delayMs: 20 } },
                    { taskId: 'branch1_B', toolName: 'dag_test_fast_tool', input: {}, dependencies: ['branch1_A'] },
                    { taskId: 'branch2_C', toolName: 'dag_test_delay_tool', input: { delayMs: 20 } },
                    { taskId: 'branch2_D', toolName: 'dag_test_fast_tool', input: {}, dependencies: ['branch2_C'] },
                ],
            };

            const handle = await frankDagEngine.createAndExecuteDag(planInput);
            const snapshot = await handle.promise;

            expect(snapshot.status).toBe('COMPLETED');
            expect(snapshot.tasks['branch1_B'].status).toBe('COMPLETED');
            expect(snapshot.tasks['branch2_D'].status).toBe('COMPLETED');
        });

        it('2.3 Handles fan-in convergence (A and B -> C)', async () => {
            const planInput: FrankDagPlanInput = {
                tenantId: TENANT_A,
                tasks: [
                    { taskId: 'parent_A', toolName: 'dag_test_delay_tool', input: { delayMs: 15 } },
                    { taskId: 'parent_B', toolName: 'dag_test_delay_tool', input: { delayMs: 25 } },
                    { taskId: 'child_C', toolName: 'dag_test_fast_tool', input: {}, dependencies: ['parent_A', 'parent_B'] },
                ],
            };

            const handle = await frankDagEngine.createAndExecuteDag(planInput);
            const snapshot = await handle.promise;

            expect(snapshot.status).toBe('COMPLETED');
            expect(snapshot.tasks['parent_A'].status).toBe('COMPLETED');
            expect(snapshot.tasks['parent_B'].status).toBe('COMPLETED');
            expect(snapshot.tasks['child_C'].status).toBe('COMPLETED');
        });

        it('2.4 Successor stays BLOCKED while dependencies are RUNNING', async () => {
            const planInput: FrankDagPlanInput = {
                tenantId: TENANT_A,
                tasks: [
                    { taskId: 'slow_parent', toolName: 'dag_test_delay_tool', input: { delayMs: 50 } },
                    { taskId: 'dependent_child', toolName: 'dag_test_fast_tool', input: {}, dependencies: ['slow_parent'] },
                ],
            };

            const handle = await frankDagEngine.createAndExecuteDag(planInput);

            // Give initial tick time to run
            await new Promise(r => setTimeout(r, 10));

            const snapshotMid = await handle.getSnapshot();
            expect(snapshotMid.tasks['slow_parent'].status).toBe('RUNNING');
            expect(snapshotMid.tasks['dependent_child'].status).toBe('BLOCKED');

            const finalSnapshot = await handle.promise;
            expect(finalSnapshot.status).toBe('COMPLETED');
            expect(finalSnapshot.tasks['dependent_child'].status).toBe('COMPLETED');
        });
    });

    describe('3. Failure & Cancellation Isolation', () => {
        it('3.1 Predecessor failure blocks successor according to SKIP_SUCCESSORS policy', async () => {
            const planInput: FrankDagPlanInput = {
                tenantId: TENANT_A,
                predecessorFailurePolicy: 'SKIP_SUCCESSORS',
                tasks: [
                    { taskId: 'task_fail', toolName: 'dag_test_fail_tool', input: {} },
                    { taskId: 'task_successor', toolName: 'dag_test_fast_tool', input: {}, dependencies: ['task_fail'] },
                ],
            };

            const handle = await frankDagEngine.createAndExecuteDag(planInput);
            const snapshot = await handle.promise;

            expect(snapshot.status).toBe('FAILED');
            expect(snapshot.tasks['task_fail'].status).toBe('FAILED');
            expect(snapshot.tasks['task_successor'].status).toBe('SKIPPED');
        });

        it('3.2 Predecessor failure blocks successor according to FAIL_SUCCESSORS policy', async () => {
            const planInput: FrankDagPlanInput = {
                tenantId: TENANT_A,
                predecessorFailurePolicy: 'FAIL_SUCCESSORS',
                tasks: [
                    { taskId: 'task_fail', toolName: 'dag_test_fail_tool', input: {} },
                    { taskId: 'task_successor', toolName: 'dag_test_fast_tool', input: {}, dependencies: ['task_fail'] },
                ],
            };

            const handle = await frankDagEngine.createAndExecuteDag(planInput);
            const snapshot = await handle.promise;

            expect(snapshot.status).toBe('FAILED');
            expect(snapshot.tasks['task_fail'].status).toBe('FAILED');
            expect(snapshot.tasks['task_successor'].status).toBe('FAILED');
        });

        it('3.3 Manual cancellation cancels running and queued tasks', async () => {
            const planInput: FrankDagPlanInput = {
                tenantId: TENANT_A,
                tasks: [
                    { taskId: 'task_1', toolName: 'dag_test_delay_tool', input: { delayMs: 100 } },
                    { taskId: 'task_2', toolName: 'dag_test_fast_tool', input: {}, dependencies: ['task_1'] },
                ],
            };

            const handle = await frankDagEngine.createAndExecuteDag(planInput);

            await new Promise(r => setTimeout(r, 10));
            const cancelled = await handle.cancel('Operator manually cancelled DAG');
            expect(cancelled).toBe(true);

            const snapshot = await handle.promise;
            expect(snapshot.status).toBe('CANCELLED');
            expect(snapshot.tasks['task_1'].status).toBe('CANCELLED');
            expect(snapshot.tasks['task_2'].status).toBe('CANCELLED');
        });

        it('3.4 External AbortSignal cancels DAG execution', async () => {
            const controller = new AbortController();

            const planInput: FrankDagPlanInput = {
                tenantId: TENANT_A,
                tasks: [
                    { taskId: 'task_1', toolName: 'dag_test_delay_tool', input: { delayMs: 100 } },
                ],
            };

            const handle = await frankDagEngine.createAndExecuteDag(planInput, { abortSignal: controller.signal });

            await new Promise(r => setTimeout(r, 10));
            controller.abort('AbortSignal fired');

            const snapshot = await handle.promise;
            expect(snapshot.status).toBe('CANCELLED');
            expect(snapshot.tasks['task_1'].status).toBe('CANCELLED');
        });
    });

    describe('4. Tenant Isolation & Persistence Recovery', () => {
        it('4.1 Enforces strict tenant isolation on snapshot access', async () => {
            const planInput: FrankDagPlanInput = {
                tenantId: TENANT_A,
                tasks: [
                    { taskId: 'task_1', toolName: 'dag_test_fast_tool', input: {} },
                ],
            };

            const handle = await frankDagEngine.createAndExecuteDag(planInput);
            const snapshot = await handle.promise;

            // Query with correct tenant
            const validQuery = await frankDagStateService.getPlanSnapshot(TENANT_A, snapshot.dagId);
            expect(validQuery).not.toBeNull();
            expect(validQuery?.tenantId).toBe(TENANT_A);

            // Cross-tenant query MUST return null / be denied
            const crossTenantQuery = await frankDagStateService.getPlanSnapshot(TENANT_B, snapshot.dagId);
            expect(crossTenantQuery).toBeNull();
        });

        it('4.2 Reconstructs plan state accurately from persisted snapshot', async () => {
            const planInput: FrankDagPlanInput = {
                tenantId: TENANT_A,
                tasks: [
                    { taskId: 'task_A', toolName: 'dag_test_fast_tool', input: {} },
                    { taskId: 'task_B', toolName: 'dag_test_fast_tool', input: {}, dependencies: ['task_A'] },
                ],
            };

            const handle = await frankDagEngine.createAndExecuteDag(planInput);
            const snapshot = await handle.promise;

            const restoredPlan = await frankDagStateService.reconstructPlanFromSnapshot(TENANT_A, snapshot.dagId);
            expect(restoredPlan).not.toBeNull();
            expect(restoredPlan?.dagId).toBe(snapshot.dagId);
            expect(restoredPlan?.status).toBe('COMPLETED');
            expect(restoredPlan?.tasks.get('task_A')?.status).toBe('COMPLETED');
            expect(restoredPlan?.tasks.get('task_B')?.status).toBe('COMPLETED');
        });
    });
});
