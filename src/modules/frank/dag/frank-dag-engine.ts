import { randomUUID } from 'crypto';
import { logger } from '@/infra/logger';
import {
    FrankDagPlanInput,
    FrankDagPlan,
    FrankDagTask,
    FrankDagSnapshot,
    TaskStatus,
    ExecuteDagOptions,
    FrankDagTransitionEvent,
} from './frank-dag.types';
import { FrankDagValidator } from './frank-dag-validator';
import { frankDagStateService } from './frank-dag-state.service';
import { frankConcurrencyScheduler } from '../concurrency/frank-concurrency-scheduler';
import { TaskHandle } from '../concurrency/frank-concurrency-scheduler.types';
import { frankExecutionStateService } from '../frank-execution-state.service';

export interface FrankDagExecutionHandle {
    dagId: string;
    version: number;
    tenantId: string;
    executionRunId: string;
    promise: Promise<FrankDagSnapshot>;
    cancel: (reason?: string) => Promise<boolean>;
    getSnapshot: () => Promise<FrankDagSnapshot>;
}

export class FrankDagEngine {
    private activeExecutions = new Map<string, FrankDagExecutionInstance>();

    /**
     * Accepts raw DAG input, validates structure, registers execution run,
     * and orchestrates dependency-aware parallel execution through the Frank Concurrency Scheduler.
     */
    public async createAndExecuteDag(
        planInput: FrankDagPlanInput,
        options?: ExecuteDagOptions
    ): Promise<FrankDagExecutionHandle> {
        // 1. Validate & Normalize Plan (fail closed on cycles, invalid IDs, cross-tenant leaks)
        const plan = FrankDagValidator.validateAndNormalizePlan(planInput);

        // 2. Ensure Execution Run exists or create one
        if (!plan.executionRunId) {
            const run = await frankExecutionStateService.createRun({
                tenantId: plan.tenantId,
                title: plan.title || `Execution Run for DAG ${plan.dagId}`,
                triggerSource: 'SYSTEM',
                autonomyLevel: 'EXECUTE_SAFE',
                contextJson: { dagId: plan.dagId, version: plan.version },
            });
            plan.executionRunId = run.id;
        } else {
            await frankExecutionStateService.updateRunStatusWithTenantCheck(
                plan.tenantId,
                plan.executionRunId,
                'RUNNING',
                `Executing DAG ${plan.dagId}`
            );
        }

        // 3. Save initial plan snapshot
        await frankDagStateService.savePlanSnapshot(plan.tenantId, plan);

        // 4. Create Execution Instance
        const instance = new FrankDagExecutionInstance(plan, options);
        this.activeExecutions.set(`${plan.tenantId}:${plan.dagId}`, instance);

        const handle = instance.getHandle(() => {
            this.activeExecutions.delete(`${plan.tenantId}:${plan.dagId}`);
        });

        // 5. Start Execution Loop
        process.nextTick(() => {
            instance.start();
        });

        return handle;
    }

    /**
     * Cancel an active DAG plan execution by tenantId and dagId.
     */
    public async cancelDag(tenantId: string, dagId: string, reason = 'Cancelled by caller'): Promise<boolean> {
        const key = `${tenantId}:${dagId}`;
        const instance = this.activeExecutions.get(key);
        if (!instance) return false;
        return instance.cancel(reason);
    }
}

class FrankDagExecutionInstance {
    private readonly plan: FrankDagPlan;
    private readonly options?: ExecuteDagOptions;

    private readonly runningHandles = new Map<string, TaskHandle<unknown>>();
    private isProcessingTick = false;
    private hasPendingTick = false;
    private isTerminated = false;

    private resolveExecution!: (snapshot: FrankDagSnapshot) => void;
    private rejectExecution!: (err: unknown) => void;
    public readonly completionPromise: Promise<FrankDagSnapshot>;

    private externalAbortUnsubscribe?: () => void;

    constructor(plan: FrankDagPlan, options?: ExecuteDagOptions) {
        this.plan = plan;
        this.options = options;

        this.completionPromise = new Promise<FrankDagSnapshot>((resolve, reject) => {
            this.resolveExecution = resolve;
            this.rejectExecution = reject;
        });

        // Register external AbortSignal if provided
        if (options?.abortSignal) {
            const onExternalAbort = () => {
                this.cancel(options.abortSignal?.reason || 'External AbortSignal triggered');
            };

            if (options.abortSignal.aborted) {
                onExternalAbort();
            } else {
                options.abortSignal.addEventListener('abort', onExternalAbort, { once: true });
                this.externalAbortUnsubscribe = () => {
                    options.abortSignal?.removeEventListener('abort', onExternalAbort);
                };
            }
        }
    }

    public getHandle(onCleanup: () => void): FrankDagExecutionHandle {
        this.completionPromise.finally(() => {
            if (this.externalAbortUnsubscribe) {
                this.externalAbortUnsubscribe();
            }
            onCleanup();
        });

        return {
            dagId: this.plan.dagId,
            version: this.plan.version,
            tenantId: this.plan.tenantId,
            executionRunId: this.plan.executionRunId || '',
            promise: this.completionPromise,
            cancel: (reason?: string) => this.cancel(reason),
            getSnapshot: async () => frankDagStateService.planToSnapshot(this.plan),
        };
    }

    public async start(): Promise<void> {
        if (this.isTerminated) return;

        this.plan.status = 'RUNNING';
        this.plan.startedAt = new Date().toISOString();
        this.plan.updatedAt = new Date().toISOString();

        await frankDagStateService.savePlanSnapshot(this.plan.tenantId, this.plan);

        // Check pre-aborted state
        if (this.options?.abortSignal?.aborted) {
            await this.cancel(this.options.abortSignal.reason || 'Pre-aborted AbortSignal');
            return;
        }

        await this.evaluateAndDispatchTick();
    }

    /**
     * Entrypoint for evaluating dependencies and dispatching READY tasks.
     * Guarantees no dropped ticks if a task completes during an active tick pass.
     */
    private async evaluateAndDispatchTick(): Promise<void> {
        if (this.isTerminated) return;

        if (this.isProcessingTick) {
            this.hasPendingTick = true;
            return;
        }

        this.isProcessingTick = true;

        try {
            do {
                this.hasPendingTick = false;
                await this.runTickCycle();
            } while (this.hasPendingTick && !this.isTerminated);
        } finally {
            this.isProcessingTick = false;
        }
    }

    /**
     * Executes a single tick cycle. Loops state evaluations as long as state changes occur.
     */
    private async runTickCycle(): Promise<void> {
        if (this.isTerminated) return;

        let stateChangedInCycle = false;

        // Loop dependency state updates to cascade multi-level changes (A -> B -> C) in a single pass
        let innerPassChanged: boolean;
        do {
            innerPassChanged = false;

            for (const [taskId, task] of this.plan.tasks.entries()) {
                if (task.status !== 'BLOCKED') continue;

                const depStatuses = task.dependencies.map(depId => {
                    const depTask = this.plan.tasks.get(depId);
                    return { depId, status: depTask ? depTask.status : 'FAILED' };
                });

                const anyFailedOrCancelledOrSkipped = depStatuses.some(d =>
                    d.status === 'FAILED' || d.status === 'CANCELLED' || d.status === 'SKIPPED'
                );

                if (anyFailedOrCancelledOrSkipped) {
                    const blockingDep = depStatuses.find(d => ['FAILED', 'CANCELLED', 'SKIPPED'].includes(d.status))!;
                    const policy = this.plan.predecessorFailurePolicy;
                    let targetStatus: TaskStatus = 'SKIPPED';
                    if (policy === 'FAIL_SUCCESSORS') targetStatus = 'FAILED';
                    if (policy === 'CANCEL_SUCCESSORS') targetStatus = 'CANCELLED';

                    const reason = `Predecessor task [${blockingDep.depId}] ended with status [${blockingDep.status}]. Policy [${policy}] applied.`;
                    await this.transitionTaskStatus(taskId, targetStatus, reason);
                    innerPassChanged = true;
                    stateChangedInCycle = true;
                    continue;
                }

                const allCompleted = depStatuses.length === 0 || depStatuses.every(d => d.status === 'COMPLETED');
                if (allCompleted) {
                    const reason = task.dependencies.length === 0
                        ? 'Task has no dependencies; immediately eligible.'
                        : `All dependencies satisfied: [${task.dependencies.join(', ')}].`;

                    await this.transitionTaskStatus(taskId, 'READY', reason);
                    innerPassChanged = true;
                    stateChangedInCycle = true;
                }
            }
        } while (innerPassChanged && !this.isTerminated);

        // Dispatch all READY tasks to FrankConcurrencyScheduler
        for (const [taskId, task] of this.plan.tasks.entries()) {
            if (task.status !== 'READY') continue;

            await this.transitionTaskStatus(taskId, 'RUNNING', 'Dispatched to Frank Concurrency Scheduler');

            const toolInput = typeof task.input === 'object' && task.input !== null
                ? { tenantId: task.tenantId, ...task.input }
                : { tenantId: task.tenantId, value: task.input };

            // Enqueue into Scheduler
            const handle = frankConcurrencyScheduler.scheduleToolExecution({
                tenantId: task.tenantId,
                taskId,
                title: task.title,
                toolName: task.toolName,
                input: toolInput,
                priority: task.priority,
                executionParams: task.executionParams,
            });

            this.runningHandles.set(taskId, handle);

            // Handle promise resolution
            handle.promise.then(async (result) => {
                this.runningHandles.delete(taskId);

                if (task.status === 'CANCELLED') return;

                if (handle.status === 'CANCELLED' || (result.error && result.error.code === 'CANCELLED')) {
                    await this.transitionTaskStatus(taskId, 'CANCELLED', result.error?.message || 'Task cancelled in Scheduler');
                } else if (result.ok) {
                    task.result = result;
                    await this.transitionTaskStatus(taskId, 'COMPLETED', `Tool [${task.toolName}] executed successfully in ${result.durationMs}ms`);
                } else {
                    task.error = {
                        code: result.error?.code || 'TOOL_EXECUTION_ERROR',
                        message: result.error?.message || 'Tool execution failed',
                    };
                    await this.transitionTaskStatus(taskId, 'FAILED', `Tool [${task.toolName}] failed: ${task.error.message}`);
                }

                // Trigger tick on completion
                process.nextTick(() => this.evaluateAndDispatchTick());
            }).catch(async (err) => {
                this.runningHandles.delete(taskId);
                if (task.status === 'CANCELLED') return;

                task.error = {
                    code: 'SCHEDULER_DISPATCH_ERROR',
                    message: err instanceof Error ? err.message : String(err),
                };
                await this.transitionTaskStatus(taskId, 'FAILED', `Scheduler execution error: ${task.error.message}`);

                process.nextTick(() => this.evaluateAndDispatchTick());
            });

            stateChangedInCycle = true;
        }

        // Save snapshot if any state changed
        if (stateChangedInCycle) {
            await frankDagStateService.savePlanSnapshot(this.plan.tenantId, this.plan);
        }

        // Check for Terminal State
        await this.checkTerminalState();
    }

    private async transitionTaskStatus(taskId: string, toStatus: TaskStatus, reason: string): Promise<void> {
        const task = this.plan.tasks.get(taskId);
        if (!task) return;

        const fromStatus = task.status;
        if (fromStatus === toStatus) return;

        task.status = toStatus;
        const now = new Date().toISOString();

        if (toStatus === 'READY') {
            task.readyAt = now;
        } else if (toStatus === 'RUNNING') {
            task.startedAt = now;
        } else if (['COMPLETED', 'FAILED', 'CANCELLED', 'SKIPPED'].includes(toStatus)) {
            task.completedAt = now;
        }

        this.plan.updatedAt = now;

        const transitionEvent: FrankDagTransitionEvent = {
            eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            dagId: this.plan.dagId,
            version: this.plan.version,
            tenantId: this.plan.tenantId,
            taskId,
            fromStatus,
            toStatus,
            reason,
            timestamp: now,
        };

        await frankDagStateService.recordTransitionEvent(transitionEvent);
    }

    private async checkTerminalState(): Promise<void> {
        if (this.isTerminated) return;

        const tasks = Array.from(this.plan.tasks.values());

        const isAnyRunning = tasks.some(t => t.status === 'RUNNING' || t.status === 'READY');
        if (isAnyRunning) return; // Still running tasks

        // Check if all tasks reached terminal states
        const allTerminal = tasks.every(t =>
            ['COMPLETED', 'FAILED', 'CANCELLED', 'SKIPPED'].includes(t.status)
        );

        if (!allTerminal) {
            // Check if remaining BLOCKED tasks are completely stuck (which shouldn't happen unless a predecessor failed)
            const blockedTasks = tasks.filter(t => t.status === 'BLOCKED');
            if (blockedTasks.length > 0) {
                // Force tick to cascade predecessor failure policies if needed
                return;
            }
        }

        const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;
        const failedCount = tasks.filter(t => t.status === 'FAILED').length;
        const skippedCount = tasks.filter(t => t.status === 'SKIPPED').length;
        const cancelledCount = tasks.filter(t => t.status === 'CANCELLED').length;

        this.isTerminated = true;
        this.plan.completedAt = new Date().toISOString();
        this.plan.updatedAt = this.plan.completedAt;

        let finalRunStatus: import('../frank-execution-state.service').ExecutionRunStatus = 'COMPLETED';

        if (this.plan.status === 'CANCELLED' || cancelledCount === tasks.length) {
            this.plan.status = 'CANCELLED';
            finalRunStatus = 'CANCELLED';
        } else if (completedCount === tasks.length) {
            this.plan.status = 'COMPLETED';
            finalRunStatus = 'COMPLETED';
        } else if (completedCount > 0 && (failedCount > 0 || skippedCount > 0)) {
            this.plan.status = 'PARTIALLY_FAILED';
            finalRunStatus = 'FAILED';
        } else {
            this.plan.status = 'FAILED';
            finalRunStatus = 'FAILED';
        }

        // Persist final plan snapshot
        const snapshot = await frankDagStateService.savePlanSnapshot(this.plan.tenantId, this.plan);

        // Update Execution Run Status
        if (this.plan.executionRunId) {
            await frankExecutionStateService.updateRunStatusWithTenantCheck(
                this.plan.tenantId,
                this.plan.executionRunId,
                finalRunStatus,
                undefined,
                snapshot as unknown as Record<string, unknown>
            );
        }

        logger.info('Frank DAG plan execution terminated', {
            tenantId: this.plan.tenantId,
            dagId: this.plan.dagId,
            status: this.plan.status,
            completedCount,
            failedCount,
            skippedCount,
            cancelledCount,
        });

        this.resolveExecution(snapshot);
    }

    public async cancel(reason = 'Cancelled by operator'): Promise<boolean> {
        if (this.isTerminated) return false;

        this.isTerminated = true;
        const now = new Date().toISOString();
        this.plan.status = 'CANCELLED';
        this.plan.errorMsg = reason;
        this.plan.completedAt = now;
        this.plan.updatedAt = now;

        // Cancel all running scheduler tasks
        for (const [taskId, handle] of this.runningHandles.entries()) {
            handle.cancel(reason);
            const task = this.plan.tasks.get(taskId);
            if (task && task.status === 'RUNNING') {
                await this.transitionTaskStatus(taskId, 'CANCELLED', reason);
            }
        }
        this.runningHandles.clear();

        // Transition remaining BLOCKED/READY tasks to CANCELLED
        for (const [taskId, task] of this.plan.tasks.entries()) {
            if (task.status === 'BLOCKED' || task.status === 'READY') {
                await this.transitionTaskStatus(taskId, 'CANCELLED', `DAG plan cancelled: ${reason}`);
            }
        }

        const snapshot = await frankDagStateService.savePlanSnapshot(this.plan.tenantId, this.plan);

        if (this.plan.executionRunId) {
            await frankExecutionStateService.cancelExecutionRun(
                this.plan.tenantId,
                this.plan.executionRunId,
                reason
            );
        }

        logger.info('Frank DAG execution cancelled', { tenantId: this.plan.tenantId, dagId: this.plan.dagId, reason });

        this.resolveExecution(snapshot);
        return true;
    }
}

export const frankDagEngine = new FrankDagEngine();
