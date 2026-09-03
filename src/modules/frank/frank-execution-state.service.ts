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

export class FrankExecutionStateService {
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

        const db = await this.getDbSafe();
        if (db) {
            try {
                const { frankExecutionRuns } = await import('@/drizzle/schema');
                await db.insert(frankExecutionRuns).values(newRun as any);
            } catch (err) {
                logger.warn('Failed DB insert for execution run, falling back to memory', { err });
                memoryRuns.set(id, newRun);
            }
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

        const db = await this.getDbSafe();
        if (db) {
            try {
                const { frankExecutionSteps } = await import('@/drizzle/schema');
                await db.insert(frankExecutionSteps).values(newStep as any);
            } catch (err) {
                memorySteps.set(id, newStep);
            }
        } else {
            memorySteps.set(id, newStep);
        }

        return newStep;
    }

    async updateStepCheckpoint(
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
                const { eq } = await import('drizzle-orm');
                await db.update(frankExecutionSteps).set(updateData as any).where(eq(frankExecutionSteps.id, stepId));
                return;
            } catch {}
        }

        const step = memorySteps.get(stepId);
        if (step) {
            Object.assign(step, updateData);
        }
    }

    async approveStep(stepId: string, approvedBy: string): Promise<void> {
        const approvedAt = new Date();
        const db = await this.getDbSafe();

        if (db) {
            try {
                const { frankExecutionSteps } = await import('@/drizzle/schema');
                const { eq } = await import('drizzle-orm');
                await db.update(frankExecutionSteps).set({
                    status: 'PENDING',
                    approvedBy,
                    approvedAt,
                }).where(eq(frankExecutionSteps.id, stepId));
                return;
            } catch {}
        }

        const step = memorySteps.get(stepId);
        if (step) {
            step.status = 'PENDING';
            step.approvedBy = approvedBy;
            step.approvedAt = approvedAt;
        }
    }

    async updateRunStatus(
        runId: string,
        status: ExecutionRunStatus,
        currentStep?: string,
        resultJson?: Record<string, unknown>,
        errorMsg?: string
    ): Promise<void> {
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
