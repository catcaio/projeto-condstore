import { randomUUID } from 'crypto';
import { logger } from '@/infra/logger';

export type AutonomyLevel = 'OBSERVE' | 'SUGGEST' | 'EXECUTE_SAFE' | 'EXECUTE_GUARDED' | 'HUMAN_REQUIRED';
export type RiskClass = 'SAFE' | 'GUARDED' | 'CRITICAL';
export type ExecutionRunStatus = 'PENDING' | 'RUNNING' | 'PAUSED_HUMAN_APPROVAL' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type ExecutionStepStatus = 'PENDING' | 'RUNNING' | 'AWAITING_APPROVAL' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

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

// In-Memory store fallback for unit testing or when DB is not accessible
const memoryRuns = new Map<string, FrankExecutionRunRecord>();
const memorySteps = new Map<string, FrankExecutionStepRecord>();

const VALID_RUN_TRANSITIONS: Record<ExecutionRunStatus, ExecutionRunStatus[]> = {
    PENDING: ['RUNNING', 'PAUSED_HUMAN_APPROVAL', 'CANCELLED', 'FAILED'],
    RUNNING: ['PAUSED_HUMAN_APPROVAL', 'COMPLETED', 'FAILED', 'CANCELLED'],
    PAUSED_HUMAN_APPROVAL: ['RUNNING', 'CANCELLED', 'FAILED'],
    COMPLETED: [], // Terminal state
    FAILED: ['RUNNING'], // Retry allowed
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
    private async getDbSafe() {
        if (!process.env.DATABASE_URL) return null;
        try {
            const { getDb } = await import('@/infra/db');
            return await getDb();
        } catch {
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

        memoryRuns.set(id, newRun);

        const db = await this.getDbSafe();
        if (db) {
            try {
                const { frankExecutionRuns } = await import('@/drizzle/schema');
                await db.insert(frankExecutionRuns).values(newRun as any);
            } catch (err) {
                logger.warn('Failed DB insert for execution run, falling back to memory', { err });
            }
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

        memorySteps.set(id, newStep);

        const db = await this.getDbSafe();
        if (db) {
            try {
                const { frankExecutionSteps } = await import('@/drizzle/schema');
                await db.insert(frankExecutionSteps).values(newStep as any);
            } catch (err) {
                logger.warn('Failed DB insert for execution step, falling back to memory', { err });
            }
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
                return;
            } catch (err: any) {
                logger.warn('Failed to update step checkpoint in DB, falling back to memory store', { tenantId, stepId, err });
            }
        }

        const step = memorySteps.get(stepId);
        if (step && step.tenantId === tenantId) {
            Object.assign(step, updateData);
        } else if (step && step.tenantId !== tenantId) {
            throw new Error('Cross-tenant step access denied');
        }
    }

    async approveStep(tenantId: string, stepId: string, approvedBy: string): Promise<void> {
        const approvedAt = new Date();
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
                return;
            } catch (err: any) {
                logger.warn('Failed to approve step in DB, falling back to memory store', { tenantId, stepId, err });
            }
        }

        const step = memorySteps.get(stepId);
        if (step && step.tenantId === tenantId) {
            step.status = 'PENDING';
            step.approvedBy = approvedBy;
            step.approvedAt = approvedAt;
        } else if (step && step.tenantId !== tenantId) {
            throw new Error('Cross-tenant step access denied');
        }
    }

    async updateRunStatusWithTenantCheck(
        tenantId: string,
        runId: string,
        status: ExecutionRunStatus,
        currentStep?: string,
        resultJson?: Record<string, unknown>,
        errorMsg?: string
    ): Promise<void> {
        const executionData = await this.getExecutionWithSteps(tenantId, runId);
        if (!executionData) {
            throw new Error('Cross-tenant access denied or execution run not found');
        }
        await this.updateRunStatus(runId, status, currentStep, resultJson, errorMsg);
    }

    async updateRunStatus(
        runId: string,
        status: ExecutionRunStatus,
        currentStep?: string,
        resultJson?: Record<string, unknown>,
        errorMsg?: string
    ): Promise<void> {
        const existingRun = Array.from(memoryRuns.values()).find(r => r.id === runId);
        if (existingRun && !this.isValidTransition(existingRun.status, status)) {
            throw new Error(`Invalid state transition from ${existingRun.status} to ${status}`);
        }

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
                await db.update(frankExecutionRuns).set(updateData as any).where(eq(frankExecutionRuns.id, runId));
                return;
            } catch {}
        }

        const run = memoryRuns.get(runId);
        if (run) {
            Object.assign(run, updateData);
        }
    }

    async getExecutionWithSteps(tenantId: string, executionId: string) {
        const db = await this.getDbSafe();
        if (db) {
            try {
                const { frankExecutionRuns, frankExecutionSteps } = await import('@/drizzle/schema');
                const { eq, and } = await import('drizzle-orm');
                const [run] = await db.select().from(frankExecutionRuns)
                    .where(and(eq(frankExecutionRuns.tenantId, tenantId), eq(frankExecutionRuns.executionId, executionId)))
                    .limit(1);

                if (!run) return null;

                const steps = await db.select().from(frankExecutionSteps)
                    .where(and(eq(frankExecutionSteps.tenantId, tenantId), eq(frankExecutionSteps.executionRunId, run.id)))
                    .orderBy(frankExecutionSteps.stepNumber);

                return { run: run as FrankExecutionRunRecord, steps: steps as FrankExecutionStepRecord[] };
            } catch {}
        }

        const run = Array.from(memoryRuns.values()).find(r => r.tenantId === tenantId && r.executionId === executionId);
        if (!run) return null;

        const steps = Array.from(memorySteps.values())
            .filter(s => s.tenantId === tenantId && s.executionRunId === run.id)
            .sort((a, b) => a.stepNumber - b.stepNumber);

        return { run, steps };
    }
}

export const frankExecutionStateService = new FrankExecutionStateService();
