import { randomUUID } from 'crypto';
import { logger } from '@/infra/logger';

export type AutonomyLevel = 'OBSERVE' | 'SUGGEST' | 'EXECUTE_SAFE' | 'EXECUTE_GUARDED' | 'HUMAN_REQUIRED';
export type RiskClass = 'SAFE' | 'GUARDED' | 'CRITICAL';
export type ExecutionRunStatus = 'PENDING' | 'RUNNING' | 'PAUSED_HUMAN_APPROVAL' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type ExecutionStepStatus = 'PENDING' | 'RUNNING' | 'AWAITING_APPROVAL' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export class FrankPersistenceError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
        super(message);
        this.name = 'FrankPersistenceError';
    }
}

export interface FrankExecutionRunRecord {
    id: string;
    tenantId: string;
    executionId: string;
    title: string;
    triggerSource: string;
    status: ExecutionRunStatus;
    currentStep: string | null;
    autonomyLevel: AutonomyLevel;
    contextJson: Record<string, unknown> | null;
    resultJson: Record<string, unknown> | null;
    errorMsg: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface FrankExecutionStepRecord {
    id: string;
    executionRunId: string;
    tenantId: string;
    stepNumber: number;
    stepName: string;
    actionType: string;
    status: ExecutionStepStatus;
    inputPayload: Record<string, unknown> | null;
    outputPayload: Record<string, unknown> | null;
    toolCallsJson: Record<string, unknown> | null;
    riskClass: RiskClass;
    requiresHumanApproval: boolean;
    approvedBy: string | null;
    approvedAt: Date | null;
    errorMsg: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
}

export interface CreateRunParams {
    tenantId: string;
    title: string;
    triggerSource?: 'OBSERVER' | 'MANUAL' | 'CRON' | 'SYSTEM';
    autonomyLevel?: AutonomyLevel;
    contextJson?: Record<string, unknown>;
}

export interface CreateStepParams {
    executionRunId: string;
    tenantId: string;
    stepNumber: number;
    stepName: string;
    actionType: string;
    riskClass?: RiskClass;
    requiresHumanApproval?: boolean;
    inputPayload?: Record<string, unknown>;
}

// In-Memory store for unit testing or local fallback in non-production environments
const memoryRuns = new Map<string, FrankExecutionRunRecord>();
const memorySteps = new Map<string, FrankExecutionStepRecord>();

const VALID_RUN_TRANSITIONS: Record<ExecutionRunStatus, ExecutionRunStatus[]> = {
    PENDING: ['RUNNING', 'PAUSED_HUMAN_APPROVAL', 'COMPLETED', 'CANCELLED', 'FAILED'],
    RUNNING: ['PAUSED_HUMAN_APPROVAL', 'COMPLETED', 'FAILED', 'CANCELLED'],
    PAUSED_HUMAN_APPROVAL: ['RUNNING', 'CANCELLED', 'FAILED'],
    COMPLETED: [], // Terminal state
    FAILED: ['RUNNING', 'CANCELLED'], // Retry or cancel allowed
    CANCELLED: [] // Terminal state
};

export class FrankExecutionStateService {
    /**
     * Validates if a state transition is permitted.
     */
    isValidTransition(currentStatus: ExecutionRunStatus, newStatus: ExecutionRunStatus): boolean {
        if (currentStatus === newStatus) return true;
        const allowed = VALID_RUN_TRANSITIONS[currentStatus] || [];
        return allowed.includes(newStatus);
    }

    private isProductionMode(): boolean {
        return process.env.NODE_ENV === 'production';
    }

    private async getDbSafe() {
        if (!process.env.DATABASE_URL) return null;
        try {
            const { getDb } = await import('@/infra/db');
            return await getDb();
        } catch (err) {
            if (this.isProductionMode()) {
                throw new FrankPersistenceError('Database connection unavailable in production', err);
            }
            return null;
        }
    }

    async createRun(params: CreateRunParams): Promise<FrankExecutionRunRecord> {
        const id = randomUUID();
        const executionId = `frk_exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date();

        const newRun: FrankExecutionRunRecord = {
            id,
            tenantId: params.tenantId,
            executionId,
            title: params.title,
            triggerSource: params.triggerSource || 'OBSERVER',
            status: 'PENDING',
            currentStep: null,
            autonomyLevel: params.autonomyLevel || 'OBSERVE',
            contextJson: params.contextJson || {},
            resultJson: null,
            errorMsg: null,
            startedAt: now,
            completedAt: null,
            createdAt: now,
            updatedAt: now,
        };

        const isProd = this.isProductionMode();
        let persistedInDb = false;

        const db = await this.getDbSafe();
        if (db) {
            try {
                const { frankExecutionRuns } = await import('@/drizzle/schema');
                await db.insert(frankExecutionRuns).values(newRun as any);
                persistedInDb = true;
            } catch (err) {
                if (isProd) {
                    logger.error('CRITICAL: DB insert failed for Frank execution run in production', err as Error, { tenantId: params.tenantId, executionId });
                    throw new FrankPersistenceError('Failed to persist execution run to DB in production', err);
                }
                logger.warn('Failed DB insert for execution run, falling back to memory', { err });
            }
        }

        if (!persistedInDb) {
            if (isProd) {
                throw new FrankPersistenceError('DATABASE_URL missing or DB unavailable in production');
            }
            memoryRuns.set(id, newRun);
        } else {
            memoryRuns.set(id, newRun);
        }

        logger.info('Frank Execution Run created', { tenantId: params.tenantId, executionId, runId: id });
        return newRun;
    }

    async addStep(params: CreateStepParams): Promise<FrankExecutionStepRecord> {
        const id = randomUUID();
        const now = new Date();

        const newStep: FrankExecutionStepRecord = {
            id,
            executionRunId: params.executionRunId,
            tenantId: params.tenantId,
            stepNumber: params.stepNumber,
            stepName: params.stepName,
            actionType: params.actionType,
            status: params.requiresHumanApproval ? 'AWAITING_APPROVAL' : 'PENDING',
            riskClass: params.riskClass || 'SAFE',
            requiresHumanApproval: params.requiresHumanApproval || false,
            inputPayload: params.inputPayload || {},
            outputPayload: null,
            toolCallsJson: null,
            approvedBy: null,
            approvedAt: null,
            errorMsg: null,
            startedAt: null,
            completedAt: null,
            createdAt: now,
        };

        const isProd = this.isProductionMode();
        let persistedInDb = false;

        const db = await this.getDbSafe();
        if (db) {
            try {
                const { frankExecutionSteps } = await import('@/drizzle/schema');
                await db.insert(frankExecutionSteps).values(newStep as any);
                persistedInDb = true;
            } catch (err) {
                if (isProd) {
                    logger.error('CRITICAL: DB insert failed for Frank execution step in production', err as Error, { tenantId: params.tenantId, stepId: id });
                    throw new FrankPersistenceError('Failed to persist execution step to DB in production', err);
                }
                logger.warn('Failed DB insert for step, falling back to memory', { err });
            }
        }

        if (!persistedInDb) {
            if (isProd) {
                throw new FrankPersistenceError('DATABASE_URL missing or DB unavailable in production');
            }
            memorySteps.set(id, newStep);
        } else {
            memorySteps.set(id, newStep);
        }

        return newStep;
    }

    async updateStepCheckpoint(
        tenantId: string,
        stepId: string,
        status: ExecutionStepStatus,
        outputPayload?: Record<string, unknown>,
        toolCallsJson?: Record<string, unknown>,
        errorMsg?: string
    ): Promise<void> {
        const isProd = this.isProductionMode();
        const db = await this.getDbSafe();

        const updateData: Partial<FrankExecutionStepRecord> = {
            status,
            outputPayload: outputPayload || null,
            toolCallsJson: toolCallsJson || null,
            errorMsg: errorMsg || null,
        };

        if (status === 'RUNNING') updateData.startedAt = new Date();
        else if (['COMPLETED', 'FAILED', 'SKIPPED'].includes(status)) updateData.completedAt = new Date();

        if (db) {
            try {
                const { frankExecutionSteps } = await import('@/drizzle/schema');
                const { eq, and } = await import('drizzle-orm');
                await db.update(frankExecutionSteps).set(updateData as any).where(
                    and(eq(frankExecutionSteps.id, stepId), eq(frankExecutionSteps.tenantId, tenantId))
                );
                const step = memorySteps.get(stepId);
                if (step && step.tenantId === tenantId) Object.assign(step, updateData);
                return;
            } catch (err: any) {
                if (isProd) {
                    logger.error('CRITICAL: Failed to update step checkpoint in DB in production', err as Error, { tenantId, stepId });
                    throw new FrankPersistenceError('Failed to update step checkpoint in DB in production', err);
                }
                logger.warn('Failed to update step checkpoint in DB, falling back to memory in dev/test', { tenantId, stepId, err });
            }
        }

        const step = memorySteps.get(stepId);
        if (step && step.tenantId === tenantId) {
            Object.assign(step, updateData);
        } else if (step && step.tenantId !== tenantId) {
            throw new Error('Cross-tenant step access denied');
        } else if (isProd) {
            throw new FrankPersistenceError(`Execution step [${stepId}] not found in DB`);
        }
    }

    async approveStep(tenantId: string, stepId: string, approvedBy: string): Promise<void> {
        const approvedAt = new Date();
        const isProd = this.isProductionMode();
        const db = await this.getDbSafe();

        if (db) {
            try {
                const { frankExecutionSteps } = await import('@/drizzle/schema');
                const { eq, and } = await import('drizzle-orm');
                await db.update(frankExecutionSteps).set({
                    status: 'PENDING',
                    approvedBy,
                    approvedAt,
                }).where(and(eq(frankExecutionSteps.id, stepId), eq(frankExecutionSteps.tenantId, tenantId)));

                const step = memorySteps.get(stepId);
                if (step && step.tenantId === tenantId) {
                    step.status = 'PENDING';
                    step.approvedBy = approvedBy;
                    step.approvedAt = approvedAt;
                }
                return;
            } catch (err: any) {
                if (isProd) {
                    logger.error('CRITICAL: Failed to approve step in DB in production', err as Error, { tenantId, stepId });
                    throw new FrankPersistenceError('Failed to approve step in DB in production', err);
                }
                logger.warn('Failed to approve step in DB, falling back to memory in dev/test', { tenantId, stepId, err });
            }
        }

        const step = memorySteps.get(stepId);
        if (step && step.tenantId === tenantId) {
            step.status = 'PENDING';
            step.approvedBy = approvedBy;
            step.approvedAt = approvedAt;
        } else if (step && step.tenantId !== tenantId) {
            throw new Error('Cross-tenant step access denied');
        } else if (isProd) {
            throw new FrankPersistenceError(`Execution step [${stepId}] not found in DB`);
        }
    }

    async resumeExecutionStep(
        tenantId: string,
        executionIdOrId: string,
        stepId: string,
        approvedBy: string
    ): Promise<{ run: FrankExecutionRunRecord; step: FrankExecutionStepRecord }> {
        const executionData = await this.getExecutionWithSteps(tenantId, executionIdOrId);
        if (!executionData) {
            throw new Error(`Cross-tenant access denied or execution run [${executionIdOrId}] not found for tenant [${tenantId}]`);
        }

        const step = executionData.steps.find(s => s.id === stepId && s.tenantId === tenantId);
        if (!step) {
            throw new Error(`Step [${stepId}] not found or access denied for tenant [${tenantId}]`);
        }

        await this.approveStep(tenantId, step.id, approvedBy);
        await this.updateRunStatus(executionData.run.id, 'RUNNING', `Resumed step ${step.stepName}`);

        const updated = await this.getExecutionWithSteps(tenantId, executionData.run.id);
        const updatedStep = updated?.steps.find(s => s.id === step.id);

        return {
            run: updated!.run,
            step: updatedStep!,
        };
    }

    async updateRunStatusWithTenantCheck(
        tenantId: string,
        runIdOrExecutionId: string,
        status: ExecutionRunStatus,
        currentStep?: string,
        resultJson?: Record<string, unknown>,
        errorMsg?: string
    ): Promise<void> {
        const executionData = await this.getExecutionWithSteps(tenantId, runIdOrExecutionId);
        if (!executionData) {
            throw new Error('Cross-tenant access denied or execution run not found');
        }
        await this.updateRunStatus(executionData.run.id, status, currentStep, resultJson, errorMsg);
    }

    async updateRunStatus(
        runId: string,
        status: ExecutionRunStatus,
        currentStep?: string,
        resultJson?: Record<string, unknown>,
        errorMsg?: string
    ): Promise<void> {
        const existingRun = Array.from(memoryRuns.values()).find(r => r.id === runId || r.executionId === runId);
        if (existingRun && !this.isValidTransition(existingRun.status, status)) {
            throw new Error(`Invalid state transition from ${existingRun.status} to ${status}`);
        }

        const isProd = this.isProductionMode();
        const db = await this.getDbSafe();
        const updateData: Partial<FrankExecutionRunRecord> = {
            status,
            currentStep: currentStep || null,
            resultJson: resultJson || null,
            errorMsg: errorMsg || null,
            updatedAt: new Date(),
        };

        if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(status)) {
            updateData.completedAt = new Date();
        }

        if (db) {
            try {
                const { frankExecutionRuns } = await import('@/drizzle/schema');
                const { eq } = await import('drizzle-orm');
                const actualRunId = existingRun ? existingRun.id : runId;
                await db.update(frankExecutionRuns).set(updateData as any).where(eq(frankExecutionRuns.id, actualRunId));

                const run = memoryRuns.get(actualRunId);
                if (run) Object.assign(run, updateData);
                return;
            } catch (err) {
                if (isProd) {
                    logger.error('CRITICAL: Failed to update run status in DB in production', err as Error, { runId, status });
                    throw new FrankPersistenceError('Failed to update run status in DB in production', err);
                }
                logger.warn('Failed to update run status in DB, using memory fallback in dev/test', { runId, err });
            }
        }

        const actualRunId = existingRun ? existingRun.id : runId;
        const run = memoryRuns.get(actualRunId);
        if (run) {
            Object.assign(run, updateData);
        } else if (isProd) {
            throw new FrankPersistenceError(`Execution run [${runId}] not found in DB`);
        }
    }

    async cancelExecutionRun(tenantId: string, runIdOrExecutionId: string, reason: string): Promise<void> {
        await this.updateRunStatusWithTenantCheck(tenantId, runIdOrExecutionId, 'CANCELLED', 'Cancelado pelo operador/sistema', undefined, reason);
        logger.info('Frank Execution Run cancelled', { tenantId, runIdOrExecutionId, reason });
    }

    async recoverActiveExecutions(tenantId: string): Promise<FrankExecutionRunRecord[]> {
        const db = await this.getDbSafe();
        if (db) {
            try {
                const { frankExecutionRuns } = await import('@/drizzle/schema');
                const { eq, inArray, and } = await import('drizzle-orm');

                const active = await db.select().from(frankExecutionRuns)
                    .where(and(
                        eq(frankExecutionRuns.tenantId, tenantId),
                        inArray(frankExecutionRuns.status, ['PENDING', 'RUNNING', 'PAUSED_HUMAN_APPROVAL'])
                    ));

                if (active.length > 0) {
                    return active as FrankExecutionRunRecord[];
                }
            } catch (err) {
                logger.warn('Failed recovering active executions from DB, checking memory', { tenantId, err });
            }
        }

        return Array.from(memoryRuns.values()).filter(
            r => r.tenantId === tenantId && ['PENDING', 'RUNNING', 'PAUSED_HUMAN_APPROVAL'].includes(r.status)
        );
    }

    async getExecutionWithSteps(tenantId: string, executionIdOrId: string) {
        const db = await this.getDbSafe();
        if (db) {
            try {
                const { frankExecutionRuns, frankExecutionSteps } = await import('@/drizzle/schema');
                const { eq, and, or } = await import('drizzle-orm');

                const [run] = await db.select().from(frankExecutionRuns)
                    .where(and(
                        eq(frankExecutionRuns.tenantId, tenantId),
                        or(
                            eq(frankExecutionRuns.executionId, executionIdOrId),
                            eq(frankExecutionRuns.id, executionIdOrId)
                        )
                    ))
                    .limit(1);

                if (run) {
                    const steps = await db.select().from(frankExecutionSteps)
                        .where(and(eq(frankExecutionSteps.tenantId, tenantId), eq(frankExecutionSteps.executionRunId, run.id)))
                        .orderBy(frankExecutionSteps.stepNumber);

                    return { run: run as FrankExecutionRunRecord, steps: steps as FrankExecutionStepRecord[] };
                }
            } catch (err) {
                logger.warn('Failed querying execution from DB, trying memory fallback', { tenantId, executionIdOrId, err });
            }
        }

        const run = Array.from(memoryRuns.values()).find(
            r => r.tenantId === tenantId && (r.executionId === executionIdOrId || r.id === executionIdOrId)
        );
        if (!run) return null;

        const steps = Array.from(memorySteps.values())
            .filter(s => s.tenantId === tenantId && s.executionRunId === run.id)
            .sort((a, b) => a.stepNumber - b.stepNumber);

        return { run, steps };
    }
}

export const frankExecutionStateService = new FrankExecutionStateService();
