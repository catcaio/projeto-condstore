import { randomUUID } from 'crypto';
import { eq, and, asc } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import {
    frankExecutionRuns,
    frankExecutionSteps,
    frankExecutionTurns,
} from '@/drizzle/schema';

export class VersionConflictError extends Error {
    constructor(
        public readonly entity: 'run' | 'step',
        public readonly id: string,
        public readonly expectedVersion: number
    ) {
        super(`Version conflict on ${entity} ${id}: expected version ${expectedVersion}`);
        this.name = 'VersionConflictError';
    }
}

export class TenantMismatchError extends Error {
    constructor(
        public readonly entity: 'run' | 'step' | 'turn',
        public readonly id: string
    ) {
        super(`Tenant mismatch on ${entity} ${id}`);
        this.name = 'TenantMismatchError';
    }
}

export class UnknownExecutionEntityError extends Error {
    constructor(
        public readonly entity: 'run' | 'step' | 'turn',
        public readonly id: string
    ) {
        super(`Unknown ${entity}: ${id}`);
        this.name = 'UnknownExecutionEntityError';
    }
}

export class DuplicateTurnError extends Error {
    constructor(
        public readonly runId: string,
        public readonly turn: number
    ) {
        super(`Duplicate turn ${turn} for run ${runId}`);
        this.name = 'DuplicateTurnError';
    }
}

export class TurnRegressionError extends Error {
    constructor(
        public readonly runId: string,
        public readonly turn: number,
        public readonly maxTurn: number
    ) {
        super(`Turn regression for run ${runId}: turn ${turn} after max ${maxTurn}`);
        this.name = 'TurnRegressionError';
    }
}

export interface TransitionRunParams {
    tenantId: string;
    runId: string;
    expectedVersion: number;
    status: string;
    currentStep?: string | null;
    resultJson?: Record<string, unknown> | null;
    errorMsg?: string | null;
    completedAt?: Date | null;
    startedAt?: Date | null;
}

export interface TransitionStepParams {
    tenantId: string;
    stepId: string;
    expectedVersion: number;
    status: string;
    outputPayload?: Record<string, unknown> | null;
    toolCallsJson?: Record<string, unknown> | null;
    errorMsg?: string | null;
    approvedBy?: string | null;
    approvedAt?: Date | null;
    completedAt?: Date | null;
    startedAt?: Date | null;
}

export interface RecordTurnParams {
    tenantId: string;
    runId: string;
    turn: number;
    envelope: Record<string, unknown>;
}

export interface ExecutionTurn {
    id: string;
    runId: string;
    tenantId: string;
    turn: number;
    envelope: Record<string, unknown>;
    createdAt: Date;
}

export interface ExecutionCasStore {
    readRunVersion(tenantId: string, runId: string): Promise<number>;
    transitionRun(params: TransitionRunParams): Promise<number>;
    transitionStep(params: TransitionStepParams): Promise<number>;
    recordTurn(params: RecordTurnParams): Promise<void>;
    listTurns(tenantId: string, runId: string): Promise<ExecutionTurn[]>;
}

function extractAffectedRows(result: unknown): number {
    if (Array.isArray(result) && result[0] && typeof result[0] === 'object') {
        const first = result[0] as { affectedRows?: number; rowsAffected?: number };
        if (typeof first.affectedRows === 'number') return first.affectedRows;
        if (typeof first.rowsAffected === 'number') return first.rowsAffected;
    }
    const direct = result as { affectedRows?: number; rowsAffected?: number } | undefined;
    if (typeof direct?.affectedRows === 'number') return direct.affectedRows;
    if (typeof direct?.rowsAffected === 'number') return direct.rowsAffected;
    return 0;
}

export class DrizzleExecutionCasStore implements ExecutionCasStore {
    async readRunVersion(tenantId: string, runId: string): Promise<number> {
        const db = await getDb();
        const rows = await db
            .select({
                tenantId: frankExecutionRuns.tenantId,
                version: frankExecutionRuns.version,
            })
            .from(frankExecutionRuns)
            .where(eq(frankExecutionRuns.id, runId));

        if (rows.length === 0) {
            throw new UnknownExecutionEntityError('run', runId);
        }
        if (rows[0].tenantId !== tenantId) {
            throw new TenantMismatchError('run', runId);
        }
        return rows[0].version;
    }

    async transitionRun(params: TransitionRunParams): Promise<number> {
        const db = await getDb();
        const set: Record<string, unknown> = {
            version: params.expectedVersion + 1,
        };
        if (params.status !== undefined) set.status = params.status;
        if (params.currentStep !== undefined) set.currentStep = params.currentStep;
        if (params.resultJson !== undefined) set.resultJson = params.resultJson;
        if (params.errorMsg !== undefined) set.errorMsg = params.errorMsg;
        if (params.completedAt !== undefined) set.completedAt = params.completedAt;
        if (params.startedAt !== undefined) set.startedAt = params.startedAt;

        const result = await db
            .update(frankExecutionRuns)
            .set(set)
            .where(
                and(
                    eq(frankExecutionRuns.id, params.runId),
                    eq(frankExecutionRuns.tenantId, params.tenantId),
                    eq(frankExecutionRuns.version, params.expectedVersion)
                )
            );

        if (extractAffectedRows(result) === 0) {
            await this.diagnoseRunFailure(params.tenantId, params.runId, params.expectedVersion);
        }
        return params.expectedVersion + 1;
    }

    async transitionStep(params: TransitionStepParams): Promise<number> {
        const db = await getDb();
        const set: Record<string, unknown> = {
            version: params.expectedVersion + 1,
        };
        if (params.status !== undefined) set.status = params.status;
        if (params.outputPayload !== undefined) set.outputPayload = params.outputPayload;
        if (params.toolCallsJson !== undefined) set.toolCallsJson = params.toolCallsJson;
        if (params.errorMsg !== undefined) set.errorMsg = params.errorMsg;
        if (params.approvedBy !== undefined) set.approvedBy = params.approvedBy;
        if (params.approvedAt !== undefined) set.approvedAt = params.approvedAt;
        if (params.completedAt !== undefined) set.completedAt = params.completedAt;
        if (params.startedAt !== undefined) set.startedAt = params.startedAt;

        const result = await db
            .update(frankExecutionSteps)
            .set(set)
            .where(
                and(
                    eq(frankExecutionSteps.id, params.stepId),
                    eq(frankExecutionSteps.tenantId, params.tenantId),
                    eq(frankExecutionSteps.version, params.expectedVersion)
                )
            );

        if (extractAffectedRows(result) === 0) {
            await this.diagnoseStepFailure(params.tenantId, params.stepId, params.expectedVersion);
        }
        return params.expectedVersion + 1;
    }

    async recordTurn(params: RecordTurnParams): Promise<void> {
        await this.assertRunBelongsToTenant(params.tenantId, params.runId);

        const db = await getDb();
        const rows = await db
            .select({ turn: frankExecutionTurns.turn })
            .from(frankExecutionTurns)
            .where(
                and(
                    eq(frankExecutionTurns.runId, params.runId),
                    eq(frankExecutionTurns.tenantId, params.tenantId)
                )
            )
            .orderBy(asc(frankExecutionTurns.turn));

        const existingTurns = rows.map((r) => r.turn);
        if (existingTurns.includes(params.turn)) {
            throw new DuplicateTurnError(params.runId, params.turn);
        }
        const maxTurn = existingTurns.length === 0 ? 0 : Math.max(...existingTurns);
        if (params.turn <= maxTurn) {
            throw new TurnRegressionError(params.runId, params.turn, maxTurn);
        }

        await db.insert(frankExecutionTurns).values({
            id: randomUUID(),
            runId: params.runId,
            tenantId: params.tenantId,
            turn: params.turn,
            envelopeJson: JSON.stringify(params.envelope),
        });
    }

    async listTurns(tenantId: string, runId: string): Promise<ExecutionTurn[]> {
        const db = await getDb();
        const rows = await db
            .select()
            .from(frankExecutionTurns)
            .where(
                and(
                    eq(frankExecutionTurns.runId, runId),
                    eq(frankExecutionTurns.tenantId, tenantId)
                )
            )
            .orderBy(asc(frankExecutionTurns.turn));

        return rows.map((r) => ({
            id: r.id,
            runId: r.runId,
            tenantId: r.tenantId,
            turn: r.turn,
            envelope: parseJson(r.envelopeJson),
            createdAt: r.createdAt,
        }));
    }

    private async assertRunBelongsToTenant(tenantId: string, runId: string): Promise<void> {
        await this.readRunVersion(tenantId, runId);
    }

    private async diagnoseRunFailure(
        tenantId: string,
        runId: string,
        expectedVersion: number
    ): Promise<never> {
        const db = await getDb();
        const rows = await db
            .select({ tenantId: frankExecutionRuns.tenantId, version: frankExecutionRuns.version })
            .from(frankExecutionRuns)
            .where(eq(frankExecutionRuns.id, runId));

        if (rows.length === 0) {
            throw new UnknownExecutionEntityError('run', runId);
        }
        if (rows[0].tenantId !== tenantId) {
            throw new TenantMismatchError('run', runId);
        }
        throw new VersionConflictError('run', runId, expectedVersion);
    }

    private async diagnoseStepFailure(
        tenantId: string,
        stepId: string,
        expectedVersion: number
    ): Promise<never> {
        const db = await getDb();
        const rows = await db
            .select({ tenantId: frankExecutionSteps.tenantId, version: frankExecutionSteps.version })
            .from(frankExecutionSteps)
            .where(eq(frankExecutionSteps.id, stepId));

        if (rows.length === 0) {
            throw new UnknownExecutionEntityError('step', stepId);
        }
        if (rows[0].tenantId !== tenantId) {
            throw new TenantMismatchError('step', stepId);
        }
        throw new VersionConflictError('step', stepId, expectedVersion);
    }
}

function parseJson(value: string | null): Record<string, unknown> {
    if (!value) return {};
    try {
        return JSON.parse(value) as Record<string, unknown>;
    } catch {
        return {};
    }
}

export class InMemoryExecutionCasStore implements ExecutionCasStore {
    private runs = new Map<
        string,
        { tenantId: string; status: string; version: number }
    >();
    private steps = new Map<
        string,
        { tenantId: string; status: string; version: number }
    >();
    private turns = new Map<string, ExecutionTurn[]>();

    async readRunVersion(tenantId: string, runId: string): Promise<number> {
        const run = this.runs.get(runId);
        if (!run) throw new UnknownExecutionEntityError('run', runId);
        if (run.tenantId !== tenantId) throw new TenantMismatchError('run', runId);
        return run.version;
    }

    async transitionRun(params: TransitionRunParams): Promise<number> {
        const run = this.runs.get(params.runId);
        if (!run) throw new UnknownExecutionEntityError('run', params.runId);
        if (run.tenantId !== params.tenantId) throw new TenantMismatchError('run', params.runId);
        if (run.version !== params.expectedVersion) {
            throw new VersionConflictError('run', params.runId, params.expectedVersion);
        }
        run.version += 1;
        run.status = params.status;
        return run.version;
    }

    async transitionStep(params: TransitionStepParams): Promise<number> {
        const step = this.steps.get(params.stepId);
        if (!step) throw new UnknownExecutionEntityError('step', params.stepId);
        if (step.tenantId !== params.tenantId) throw new TenantMismatchError('step', params.stepId);
        if (step.version !== params.expectedVersion) {
            throw new VersionConflictError('step', params.stepId, params.expectedVersion);
        }
        step.version += 1;
        step.status = params.status;
        return step.version;
    }

    async recordTurn(params: RecordTurnParams): Promise<void> {
        await this.readRunVersion(params.tenantId, params.runId);
        const list = this.turns.get(params.runId) ?? [];
        if (list.some((t) => t.turn === params.turn)) {
            throw new DuplicateTurnError(params.runId, params.turn);
        }
        const maxTurn = list.length === 0 ? 0 : Math.max(...list.map((t) => t.turn));
        if (params.turn <= maxTurn) {
            throw new TurnRegressionError(params.runId, params.turn, maxTurn);
        }
        list.push({
            id: randomUUID(),
            runId: params.runId,
            tenantId: params.tenantId,
            turn: params.turn,
            envelope: params.envelope,
            createdAt: new Date(),
        });
        this.turns.set(params.runId, list);
    }

    async listTurns(tenantId: string, runId: string): Promise<ExecutionTurn[]> {
        const run = this.runs.get(runId);
        if (!run) throw new UnknownExecutionEntityError('run', runId);
        if (run.tenantId !== tenantId) throw new TenantMismatchError('run', runId);
        return (this.turns.get(runId) ?? [])
            .filter((t) => t.tenantId === tenantId)
            .sort((a, b) => a.turn - b.turn);
    }

    seedRun(runId: string, tenantId: string, version = 1, status = 'PENDING'): void {
        this.runs.set(runId, { tenantId, version, status });
    }

    seedStep(stepId: string, tenantId: string, version = 1, status = 'PENDING'): void {
        this.steps.set(stepId, { tenantId, version, status });
    }
}

export class FrankExecutionCasService {
    constructor(private readonly store: ExecutionCasStore) {}

    readVersion(tenantId: string, runId: string): Promise<number> {
        return this.store.readRunVersion(tenantId, runId);
    }

    transitionRun(params: TransitionRunParams): Promise<number> {
        return this.store.transitionRun(params);
    }

    transitionStep(params: TransitionStepParams): Promise<number> {
        return this.store.transitionStep(params);
    }

    recordTurn(params: RecordTurnParams): Promise<void> {
        return this.store.recordTurn(params);
    }

    listTurns(tenantId: string, runId: string): Promise<ExecutionTurn[]> {
        return this.store.listTurns(tenantId, runId);
    }
}

export const frankExecutionCasService = new FrankExecutionCasService(
    new DrizzleExecutionCasStore()
);
