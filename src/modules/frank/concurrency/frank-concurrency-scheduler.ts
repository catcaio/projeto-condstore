import { logger } from '@/infra/logger';
import { frankExecutionRuntime, StructuredToolExecutionResult } from '../frank-execution-runtime';
import {
    TaskPriority,
    TaskStatus,
    SchedulerConfig,
    ScheduleTaskParams,
    TaskHandle,
    TaskMetrics,
    SchedulerSnapshot,
} from './frank-concurrency-scheduler.types';

const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
    maxGlobalConcurrency: 10,
    maxTenantConcurrency: 3,
    maxGlobalQueueSize: 100,
    maxTenantQueueSize: 20,
    taskQueueTimeoutMs: 60000, // 1 minute default timeout in queue
    agingIntervalMs: 5000,    // Every 5s in queue
    agingBoostAmount: 1,      // Gain +1 effective priority score
};

const PRIORITY_SCORES: Record<TaskPriority, number> = {
    HIGH: 30,
    MEDIUM: 20,
    LOW: 10,
};

interface InternalTaskItem<TOutput = unknown> {
    taskId: string;
    tenantId: string;
    title?: string;
    toolName: string;
    input: unknown;
    executionParams?: Omit<import('../frank-execution-runtime').FrankRuntimeExecutionParams, 'tenantId' | 'toolName' | 'input'>;
    basePriority: TaskPriority;
    status: TaskStatus;
    enqueuedAt: number;
    startedAt?: number;
    completedAt?: number;
    abortController: AbortController;
    resolve: (result: StructuredToolExecutionResult<TOutput>) => void;
    reject: (reason: unknown) => void;
    promise: Promise<StructuredToolExecutionResult<TOutput>>;
    externalAbortUnsubscribe?: () => void;
}

export class FrankConcurrencyScheduler {
    private readonly config: SchedulerConfig;

    // Global active & queued counts
    private activeGlobalCount = 0;
    private queuedGlobalCount = 0;

    // Per-tenant queues: map from tenantId to array of queued tasks
    private tenantQueues = new Map<string, InternalTaskItem<any>[]>();

    // Per-tenant active counts: map from tenantId to count of running tasks
    private tenantActiveCounts = new Map<string, number>();

    // All active tasks currently running
    private activeTasks = new Map<string, InternalTaskItem<any>>();

    // Per-tenant metrics tracking
    private tenantMetricsMap = new Map<string, TaskMetrics>();

    // Round-robin tenant dispatch index
    private tenantDispatchCursor = 0;

    constructor(customConfig?: Partial<SchedulerConfig>) {
        this.config = {
            ...DEFAULT_SCHEDULER_CONFIG,
            ...customConfig,
        };
    }

    /**
     * Schedule a tool execution task.
     * Enforces queue limits, per-tenant concurrency, priority ordering, aging, and cancellation.
     */
    public scheduleToolExecution<TInput = unknown, TOutput = unknown>(
        params: ScheduleTaskParams<TInput>
    ): TaskHandle<TOutput> {
        const { tenantId, toolName, input, executionParams, priority = 'MEDIUM', abortSignal } = params;

        if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
            throw new Error('Scheduler task execution rejected: valid tenantId is required.');
        }

        const taskId = params.taskId || `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const metrics = this.getOrCreateTenantMetrics(tenantId);

        // Check Backpressure / Capacity Limits
        const tenantQueue = this.tenantQueues.get(tenantId) || [];
        if (
            this.queuedGlobalCount >= this.config.maxGlobalQueueSize ||
            tenantQueue.length >= this.config.maxTenantQueueSize
        ) {
            metrics.rejectedCount++;
            logger.warn('frank_scheduler_task_rejected_capacity', {
                taskId,
                tenantId,
                toolName,
                globalQueued: this.queuedGlobalCount,
                tenantQueued: tenantQueue.length,
            });

            const rejectedResult: StructuredToolExecutionResult<TOutput> = {
                ok: false,
                status: 'POLICY_BLOCKED',
                action: toolName,
                toolName,
                executionId: taskId,
                riskLevel: 'LOW_RISK',
                durationMs: 0,
                data: null,
                error: {
                    code: 'QUEUE_SATURATED',
                    message: `Task rejected by Frank Scheduler: queue capacity reached (global: ${this.queuedGlobalCount}/${this.config.maxGlobalQueueSize}, tenant: ${tenantQueue.length}/${this.config.maxTenantQueueSize}).`,
                },
                evidence: null,
                metadata: { tenantId, taskId, rejected: true },
            };

            const rejectedPromise = Promise.resolve(rejectedResult);
            const dummyAbortController = new AbortController();

            return {
                taskId,
                tenantId,
                toolName,
                priority,
                get status(): TaskStatus {
                    return 'REJECTED';
                },
                promise: rejectedPromise,
                cancel: () => false,
                abortSignal: dummyAbortController.signal,
            };
        }

        const abortController = new AbortController();

        let resolvePromise!: (result: StructuredToolExecutionResult<TOutput>) => void;
        let rejectPromise!: (reason: unknown) => void;

        const promise = new Promise<StructuredToolExecutionResult<TOutput>>((res, rej) => {
            resolvePromise = res;
            rejectPromise = rej;
        });

        const taskItem: InternalTaskItem<TOutput> = {
            taskId,
            tenantId,
            title: params.title,
            toolName,
            input,
            executionParams,
            basePriority: priority,
            status: 'QUEUED',
            enqueuedAt: Date.now(),
            abortController,
            resolve: resolvePromise,
            reject: rejectPromise,
            promise,
        };

        // Handle external AbortSignal if supplied
        if (abortSignal) {
            if (abortSignal.aborted) {
                this.cancelTaskInternal(taskItem, abortSignal.reason || 'External AbortSignal pre-aborted');
            } else {
                const onExternalAbort = () => {
                    this.cancelTaskInternal(taskItem, abortSignal.reason || 'External AbortSignal triggered');
                };
                abortSignal.addEventListener('abort', onExternalAbort, { once: true });
                taskItem.externalAbortUnsubscribe = () => {
                    abortSignal.removeEventListener('abort', onExternalAbort);
                };
            }
        }

        if (!this.tenantQueues.has(tenantId)) {
            this.tenantQueues.set(tenantId, []);
        }
        this.tenantQueues.get(tenantId)!.push(taskItem);
        this.queuedGlobalCount++;
        metrics.queuedCount++;

        logger.info('frank_scheduler_task_enqueued', {
            taskId,
            tenantId,
            toolName,
            priority,
            globalQueued: this.queuedGlobalCount,
        });

        // Trigger dispatch process
        process.nextTick(() => this.dispatchNext());

        const handle: TaskHandle<TOutput> = {
            taskId,
            tenantId,
            toolName,
            priority,
            get status() {
                return taskItem.status;
            },
            promise: taskItem.promise,
            cancel: (reason?: string) => this.cancelTaskInternal(taskItem, reason || 'Cancelled by caller'),
            abortSignal: abortController.signal,
        };

        return handle;
    }

    /**
     * Cancel a task whether it is currently queued or running.
     */
    private cancelTaskInternal(taskItem: InternalTaskItem<any>, reason: string): boolean {
        if (taskItem.status === 'COMPLETED' || taskItem.status === 'FAILED' || taskItem.status === 'CANCELLED' || taskItem.status === 'REJECTED') {
            return false;
        }

        const metrics = this.getOrCreateTenantMetrics(taskItem.tenantId);

        if (taskItem.status === 'QUEUED') {
            taskItem.status = 'CANCELLED';
            taskItem.completedAt = Date.now();
            metrics.cancelledCount++;

            // Remove from queue
            const queue = this.tenantQueues.get(taskItem.tenantId);
            if (queue) {
                const idx = queue.indexOf(taskItem);
                if (idx !== -1) {
                    queue.splice(idx, 1);
                    this.queuedGlobalCount--;
                }
            }

            if (taskItem.externalAbortUnsubscribe) {
                taskItem.externalAbortUnsubscribe();
            }

            logger.info('frank_scheduler_task_cancelled_in_queue', {
                taskId: taskItem.taskId,
                tenantId: taskItem.tenantId,
                reason,
            });

            taskItem.resolve({
                ok: false,
                status: 'EXECUTION_FAILED',
                action: taskItem.toolName,
                toolName: taskItem.toolName,
                executionId: taskItem.taskId,
                riskLevel: 'LOW_RISK',
                durationMs: Date.now() - taskItem.enqueuedAt,
                data: null,
                error: {
                    code: 'CANCELLED',
                    message: `Task cancelled before execution: ${reason}`,
                },
                evidence: null,
                metadata: { tenantId: taskItem.tenantId, taskId: taskItem.taskId, cancelled: true },
            });

            return true;
        }

        if (taskItem.status === 'RUNNING') {
            taskItem.status = 'CANCELLED';
            metrics.cancelledCount++;

            // Abort running controller
            taskItem.abortController.abort(reason);

            if (taskItem.externalAbortUnsubscribe) {
                taskItem.externalAbortUnsubscribe();
            }

            logger.info('frank_scheduler_task_cancelled_running', {
                taskId: taskItem.taskId,
                tenantId: taskItem.tenantId,
                reason,
            });

            return true;
        }

        return false;
    }

    /**
     * Calculate effective priority score for queued task (base score + aging boost)
     */
    private getEffectivePriority(task: InternalTaskItem<any>): number {
        const base = PRIORITY_SCORES[task.basePriority] || 20;
        if (!this.config.agingIntervalMs || !this.config.agingBoostAmount) {
            return base;
        }
        const waitTimeMs = Date.now() - task.enqueuedAt;
        const agingIntervals = Math.floor(waitTimeMs / this.config.agingIntervalMs);
        return base + (agingIntervals * this.config.agingBoostAmount);
    }

    /**
     * Dispatch loop across tenant queues using Fair Round-Robin and Priority Sorting.
     */
    private dispatchNext(): void {
        if (this.activeGlobalCount >= this.config.maxGlobalConcurrency) {
            return;
        }

        const activeTenantIds = Array.from(this.tenantQueues.keys()).filter(tId => {
            const queue = this.tenantQueues.get(tId);
            return queue && queue.length > 0;
        });

        if (activeTenantIds.length === 0) {
            return;
        }

        // Round-robin selection among active tenants to ensure multi-tenant fairness
        let candidatesChecked = 0;
        while (
            this.activeGlobalCount < this.config.maxGlobalConcurrency &&
            candidatesChecked < activeTenantIds.length
        ) {
            if (this.tenantDispatchCursor >= activeTenantIds.length) {
                this.tenantDispatchCursor = 0;
            }

            const tenantId = activeTenantIds[this.tenantDispatchCursor];
            this.tenantDispatchCursor++;
            candidatesChecked++;

            const tenantActive = this.tenantActiveCounts.get(tenantId) || 0;
            if (tenantActive >= this.config.maxTenantConcurrency) {
                continue; // Skip tenant if it hit its per-tenant concurrency limit
            }

            const queue = this.tenantQueues.get(tenantId);
            if (!queue || queue.length === 0) {
                continue;
            }

            // Sort tenant queue by effective priority (highest score first; tie-breaker enqueuedAt earlier first)
            queue.sort((a, b) => {
                const effA = this.getEffectivePriority(a);
                const effB = this.getEffectivePriority(b);
                if (effB !== effA) {
                    return effB - effA;
                }
                return a.enqueuedAt - b.enqueuedAt;
            });

            const taskToRun = queue.shift()!;
            this.queuedGlobalCount--;

            if (queue.length === 0) {
                this.tenantQueues.delete(tenantId);
            }

            this.runTask(taskToRun);

            // Reset candidatesChecked to continue dispatching if global concurrency remains available
            candidatesChecked = 0;
        }
    }

    /**
     * Execute task via FrankExecutionRuntime
     */
    private async runTask(task: InternalTaskItem<any>): Promise<void> {
        task.status = 'RUNNING';
        task.startedAt = Date.now();

        this.activeGlobalCount++;
        const currentTenantActive = this.tenantActiveCounts.get(task.tenantId) || 0;
        this.tenantActiveCounts.set(task.tenantId, currentTenantActive + 1);
        this.activeTasks.set(task.taskId, task);

        const metrics = this.getOrCreateTenantMetrics(task.tenantId);
        metrics.activeCount++;

        logger.info('frank_scheduler_task_started', {
            taskId: task.taskId,
            tenantId: task.tenantId,
            toolName: task.toolName,
            activeGlobal: this.activeGlobalCount,
            activeTenant: currentTenantActive + 1,
        });

        try {
            const result = await frankExecutionRuntime.executeTool({
                tenantId: task.tenantId,
                requestId: task.taskId,
                toolName: task.toolName,
                input: task.input,
                abortSignal: task.abortController.signal,
                ...task.executionParams,
            });

            task.completedAt = Date.now();
            if ((task.status as TaskStatus) !== 'CANCELLED') {
                if (result.ok) {
                    task.status = 'COMPLETED';
                    metrics.completedCount++;
                } else {
                    task.status = 'FAILED';
                    metrics.failedCount++;
                }
            }

            if (task.externalAbortUnsubscribe) {
                task.externalAbortUnsubscribe();
            }

            task.resolve(result);
        } catch (err) {
            task.completedAt = Date.now();
            if ((task.status as TaskStatus) !== 'CANCELLED') {
                task.status = 'FAILED';
                metrics.failedCount++;
            }

            if (task.externalAbortUnsubscribe) {
                task.externalAbortUnsubscribe();
            }

            const errorMsg = err instanceof Error ? err.message : 'Unexpected execution failure';
            logger.error('frank_scheduler_task_execution_error', err as Error, {
                taskId: task.taskId,
                tenantId: task.tenantId,
                toolName: task.toolName,
            });

            task.resolve({
                ok: false,
                status: 'EXECUTION_FAILED',
                action: task.toolName,
                toolName: task.toolName,
                executionId: task.taskId,
                riskLevel: 'LOW_RISK',
                durationMs: Date.now() - (task.startedAt || task.enqueuedAt),
                data: null,
                error: {
                    code: 'SCHEDULER_EXECUTION_ERROR',
                    message: `Scheduler execution error: ${errorMsg}`,
                },
                evidence: null,
                metadata: { tenantId: task.tenantId, taskId: task.taskId },
            });
        } finally {
            // Cleanup active counters
            this.activeGlobalCount--;
            const updatedTenantActive = (this.tenantActiveCounts.get(task.tenantId) || 1) - 1;
            if (updatedTenantActive <= 0) {
                this.tenantActiveCounts.delete(task.tenantId);
            } else {
                this.tenantActiveCounts.set(task.tenantId, updatedTenantActive);
            }
            this.activeTasks.delete(task.taskId);
            metrics.activeCount = Math.max(0, metrics.activeCount - 1);

            logger.info('frank_scheduler_task_finished', {
                taskId: task.taskId,
                tenantId: task.tenantId,
                status: task.status,
                activeGlobal: this.activeGlobalCount,
            });

            // Trigger next task in queue
            process.nextTick(() => this.dispatchNext());
        }
    }

    private getOrCreateTenantMetrics(tenantId: string): TaskMetrics {
        let m = this.tenantMetricsMap.get(tenantId);
        if (!m) {
            m = {
                queuedCount: 0,
                activeCount: 0,
                completedCount: 0,
                failedCount: 0,
                cancelledCount: 0,
                rejectedCount: 0,
            };
            this.tenantMetricsMap.set(tenantId, m);
        }
        return m;
    }

    /**
     * Provide complete diagnostic snapshot of current scheduler state.
     */
    public getSnapshot(): SchedulerSnapshot {
        const queuedTasksSummary: SchedulerSnapshot['queuedTasksSummary'] = [];
        const runningTasksSummary: SchedulerSnapshot['runningTasksSummary'] = [];
        const now = Date.now();

        for (const [tenantId, queue] of this.tenantQueues.entries()) {
            for (const task of queue) {
                queuedTasksSummary.push({
                    taskId: task.taskId,
                    tenantId,
                    toolName: task.toolName,
                    priority: task.basePriority,
                    effectivePriority: this.getEffectivePriority(task),
                    enqueuedAt: new Date(task.enqueuedAt).toISOString(),
                    waitedMs: now - task.enqueuedAt,
                });
            }
        }

        for (const [taskId, task] of this.activeTasks.entries()) {
            runningTasksSummary.push({
                taskId,
                tenantId: task.tenantId,
                toolName: task.toolName,
                startedAt: new Date(task.startedAt || now).toISOString(),
                durationMs: now - (task.startedAt || now),
            });
        }

        const tenantMetrics: Record<string, TaskMetrics> = {};
        for (const [tId, m] of this.tenantMetricsMap.entries()) {
            const queue = this.tenantQueues.get(tId);
            tenantMetrics[tId] = {
                ...m,
                queuedCount: queue ? queue.length : 0,
                activeCount: this.tenantActiveCounts.get(tId) || 0,
            };
        }

        return {
            activeGlobalCount: this.activeGlobalCount,
            queuedGlobalCount: this.queuedGlobalCount,
            config: { ...this.config },
            tenantMetrics,
            queuedTasksSummary,
            runningTasksSummary,
        };
    }
}

export const frankConcurrencyScheduler = new FrankConcurrencyScheduler();
