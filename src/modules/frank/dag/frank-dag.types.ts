import { TaskPriority } from '../concurrency/frank-concurrency-scheduler.types';
import { FrankRuntimeExecutionParams, StructuredToolExecutionResult } from '../frank-execution-runtime';

export type TaskDagStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'PARTIALLY_FAILED';

export type TaskStatus = 'BLOCKED' | 'READY' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'SKIPPED';

export type TaskPredecessorFailurePolicy = 'SKIP_SUCCESSORS' | 'FAIL_SUCCESSORS' | 'CANCEL_SUCCESSORS';

export interface FrankDagTaskInput<TInput = unknown> {
    taskId: string;
    tenantId?: string;
    title?: string;
    toolName: string;
    input: TInput;
    dependencies?: string[];
    priority?: TaskPriority;
    executionParams?: Omit<FrankRuntimeExecutionParams, 'tenantId' | 'toolName' | 'input'>;
    executionRunId?: string;
    executionStepId?: string;
}

export interface FrankDagTask<TInput = unknown> {
    taskId: string;
    tenantId: string;
    title?: string;
    toolName: string;
    input: TInput;
    dependencies: string[];
    status: TaskStatus;
    priority: TaskPriority;
    executionParams?: Omit<FrankRuntimeExecutionParams, 'tenantId' | 'toolName' | 'input'>;
    executionRunId?: string;
    executionStepId?: string;
    result?: StructuredToolExecutionResult<unknown>;
    error?: { code: string; message: string };
    blockedReason?: string;
    readyAt?: string;
    startedAt?: string;
    completedAt?: string;
}

export interface FrankDagPlanInput {
    dagId?: string;
    version?: number;
    tenantId: string;
    title?: string;
    executionRunId?: string;
    predecessorFailurePolicy?: TaskPredecessorFailurePolicy;
    tasks: FrankDagTaskInput[];
}

export interface FrankDagPlan {
    dagId: string;
    version: number;
    tenantId: string;
    title?: string;
    executionRunId?: string;
    status: TaskDagStatus;
    predecessorFailurePolicy: TaskPredecessorFailurePolicy;
    tasks: Map<string, FrankDagTask>;
    createdAt: string;
    updatedAt: string;
    startedAt?: string;
    completedAt?: string;
    errorMsg?: string;
}

export interface FrankDagSnapshot {
    dagId: string;
    version: number;
    tenantId: string;
    title?: string;
    executionRunId?: string;
    status: TaskDagStatus;
    predecessorFailurePolicy: TaskPredecessorFailurePolicy;
    tasks: Record<string, FrankDagTask>;
    createdAt: string;
    updatedAt: string;
    startedAt?: string;
    completedAt?: string;
    errorMsg?: string;
}

export interface FrankDagTransitionEvent {
    eventId: string;
    dagId: string;
    version: number;
    tenantId: string;
    taskId: string;
    fromStatus: TaskStatus;
    toStatus: TaskStatus;
    reason: string;
    timestamp: string;
}

export interface ExecuteDagOptions {
    abortSignal?: AbortSignal;
    autoStartScheduler?: boolean;
}
