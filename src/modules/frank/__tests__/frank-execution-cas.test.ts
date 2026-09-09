import { describe, it, expect } from 'vitest';
import { randomUUID } from 'crypto';
import { eq, and } from 'drizzle-orm';
import {
    FrankExecutionCasService,
    InMemoryExecutionCasStore,
    DrizzleExecutionCasStore,
    VersionConflictError,
    TenantMismatchError,
    UnknownExecutionEntityError,
    DuplicateTurnError,
    TurnRegressionError,
    InvalidEnvelopeError,
    InvalidTransitionError,
    nextTurnNumber,
} from '../frank-execution-cas';

const tenantA = 'tenant_a_test';
const tenantB = 'tenant_b_test';

function createInMemoryService(runId: string, tenantId: string, version = 1) {
    const store = new InMemoryExecutionCasStore();
    store.seedRun(runId, tenantId, version);
    return { service: new FrankExecutionCasService(store), store };
}

describe('FrankExecutionCasService (in-memory)', () => {
    it('transitions run version optimistically and rejects concurrent transitions with same expectedVersion', async () => {
        const runId = randomUUID();
        const { service } = createInMemoryService(runId, tenantA, 1);

        const [first, second] = await Promise.allSettled([
            service.transitionRun({ tenantId: tenantA, runId, expectedVersion: 1, status: 'RUNNING' }),
            service.transitionRun({ tenantId: tenantA, runId, expectedVersion: 1, status: 'COMPLETED' }),
        ]);

        const fulfilled = [first, second].filter((r) => r.status === 'fulfilled');
        const rejected = [first, second].filter((r) => r.status === 'rejected');

        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(1);
        expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(VersionConflictError);

        const finalVersion = await service.readVersion(tenantA, runId);
        expect(finalVersion).toBe(2);
    });

    it('transitions step version optimistically and rejects stale expectedVersion', async () => {
        const runId = randomUUID();
        const stepId = randomUUID();
        const store = new InMemoryExecutionCasStore();
        store.seedRun(runId, tenantA);
        store.seedStep(stepId, tenantA, 1);
        const service = new FrankExecutionCasService(store);

        await service.transitionStep({ tenantId: tenantA, stepId, expectedVersion: 1, status: 'RUNNING' });
        await expect(
            service.transitionStep({ tenantId: tenantA, stepId, expectedVersion: 1, status: 'COMPLETED' })
        ).rejects.toBeInstanceOf(VersionConflictError);

        await expect(
            service.transitionStep({ tenantId: tenantA, stepId, expectedVersion: 2, status: 'COMPLETED' })
        ).resolves.toBe(3);
    });

    it('records turns monotonically and rejects duplicates and regressions', async () => {
        const runId = randomUUID();
        const { service } = createInMemoryService(runId, tenantA);

        await service.recordTurn({ tenantId: tenantA, runId, turn: 1, envelope: { n: 1 } });
        await service.recordTurn({ tenantId: tenantA, runId, turn: 2, envelope: { n: 2 } });
        await service.recordTurn({ tenantId: tenantA, runId, turn: 3, envelope: { n: 3 } });

        await expect(
            service.recordTurn({ tenantId: tenantA, runId, turn: 2, envelope: { n: 2 } })
        ).rejects.toBeInstanceOf(DuplicateTurnError);

        await expect(
            service.recordTurn({ tenantId: tenantA, runId, turn: 0, envelope: { n: 0 } })
        ).rejects.toBeInstanceOf(TurnRegressionError);

        const turns = await service.listTurns(tenantA, runId);
        expect(turns.map((t) => t.turn)).toEqual([1, 2, 3]);
    });

    it('rejects cross-tenant reads, transitions and turn listing', async () => {
        const runId = randomUUID();
        const store = new InMemoryExecutionCasStore();
        store.seedRun(runId, tenantA, 1);
        const serviceA = new FrankExecutionCasService(store);

        await expect(serviceA.readVersion(tenantB, runId)).rejects.toBeInstanceOf(TenantMismatchError);
        await expect(
            serviceA.transitionRun({ tenantId: tenantB, runId, expectedVersion: 1, status: 'RUNNING' })
        ).rejects.toBeInstanceOf(TenantMismatchError);
        await expect(
            serviceA.recordTurn({ tenantId: tenantB, runId, turn: 1, envelope: {} })
        ).rejects.toBeInstanceOf(TenantMismatchError);

        const runB = randomUUID();
        store.seedRun(runB, tenantB);
        await serviceA.recordTurn({ tenantId: tenantA, runId, turn: 1, envelope: { owner: 'A' } });
        await serviceA.recordTurn({ tenantId: tenantB, runId: runB, turn: 1, envelope: { owner: 'B' } });

        const turnsA = await serviceA.listTurns(tenantA, runId);
        expect(turnsA).toHaveLength(1);
        expect(turnsA[0].tenantId).toBe(tenantA);

        const turnsB = await serviceA.listTurns(tenantB, runB);
        expect(turnsB).toHaveLength(1);
        expect(turnsB[0].tenantId).toBe(tenantB);

        await expect(serviceA.listTurns(tenantA, runB)).rejects.toBeInstanceOf(TenantMismatchError);
    });

    it('rejects transitions and reads for unknown entities', async () => {
        const service = new FrankExecutionCasService(new InMemoryExecutionCasStore());

        await expect(service.readVersion(tenantA, 'missing')).rejects.toBeInstanceOf(UnknownExecutionEntityError);
        await expect(
            service.transitionRun({ tenantId: tenantA, runId: 'missing', expectedVersion: 1, status: 'RUNNING' })
        ).rejects.toBeInstanceOf(UnknownExecutionEntityError);
        await expect(
            service.transitionStep({ tenantId: tenantA, stepId: 'missing', expectedVersion: 1, status: 'RUNNING' })
        ).rejects.toBeInstanceOf(UnknownExecutionEntityError);
    });

    it('calculates next turn when omitted', async () => {
        const runId = randomUUID();
        const { service } = createInMemoryService(runId, tenantA);

        await service.recordTurn({ tenantId: tenantA, runId, envelope: { n: 1 } });
        await service.recordTurn({ tenantId: tenantA, runId, envelope: { n: 2 } });
        await service.recordTurn({ tenantId: tenantA, runId, turn: 5, envelope: { n: 5 } });
        await service.recordTurn({ tenantId: tenantA, runId, envelope: { n: 6 } });

        const turns = await service.listTurns(tenantA, runId);
        expect(turns.map((t) => t.turn)).toEqual([1, 2, 5, 6]);
    });

    it('nextTurnNumber helper returns 1 for empty list and max+1 otherwise', () => {
        expect(nextTurnNumber([])).toBe(1);
        expect(nextTurnNumber([1, 2, 3])).toBe(4);
        expect(nextTurnNumber([1, 5, 3])).toBe(6);
    });

    it('rejects envelope with mismatched tenantId, runId or turn', async () => {
        const runId = randomUUID();
        const { service } = createInMemoryService(runId, tenantA);

        await expect(
            service.recordTurn({ tenantId: tenantA, runId, turn: 1, envelope: { tenantId: tenantB } })
        ).rejects.toBeInstanceOf(InvalidEnvelopeError);

        await expect(
            service.recordTurn({ tenantId: tenantA, runId, turn: 1, envelope: { runId: randomUUID() } })
        ).rejects.toBeInstanceOf(InvalidEnvelopeError);

        await expect(
            service.recordTurn({ tenantId: tenantA, runId, turn: 1, envelope: { turn: 2 } })
        ).rejects.toBeInstanceOf(InvalidEnvelopeError);

        await expect(
            service.recordTurn({ tenantId: tenantA, runId, envelope: null as unknown as Record<string, unknown> })
        ).rejects.toBeInstanceOf(InvalidEnvelopeError);
    });

    it('rejects invalid run status and leaves state unchanged', async () => {
        const runId = randomUUID();
        const { service, store } = createInMemoryService(runId, tenantA, 1);

        await expect(
            service.transitionRun({ tenantId: tenantA, runId, expectedVersion: 1, status: 'NONSENSE' })
        ).rejects.toBeInstanceOf(InvalidTransitionError);

        expect(store['runs'].get(runId)?.status).toBe('PENDING');
        expect(store['runs'].get(runId)?.version).toBe(1);
    });

    it('rejects transitions from terminal run statuses', async () => {
        const runId = randomUUID();
        const store = new InMemoryExecutionCasStore();
        store.seedRun(runId, tenantA, 1, 'COMPLETED');
        const service = new FrankExecutionCasService(store);

        await expect(
            service.transitionRun({ tenantId: tenantA, runId, expectedVersion: 1, status: 'RUNNING' })
        ).rejects.toBeInstanceOf(InvalidTransitionError);

        store.seedRun(runId, tenantA, 1, 'CANCELLED');
        await expect(
            service.transitionRun({ tenantId: tenantA, runId, expectedVersion: 1, status: 'RUNNING' })
        ).rejects.toBeInstanceOf(InvalidTransitionError);
    });

    it('allows FAILED run to transition', async () => {
        const runId = randomUUID();
        const store = new InMemoryExecutionCasStore();
        store.seedRun(runId, tenantA, 1, 'FAILED');
        const service = new FrankExecutionCasService(store);

        await expect(
            service.transitionRun({ tenantId: tenantA, runId, expectedVersion: 1, status: 'RUNNING' })
        ).resolves.toBe(2);
    });

    it('rejects transitions from terminal step statuses', async () => {
        const runId = randomUUID();
        const stepId = randomUUID();
        const store = new InMemoryExecutionCasStore();
        store.seedRun(runId, tenantA);
        store.seedStep(stepId, tenantA, 1, 'COMPLETED');
        const service = new FrankExecutionCasService(store);

        await expect(
            service.transitionStep({ tenantId: tenantA, stepId, expectedVersion: 1, status: 'RUNNING' })
        ).rejects.toBeInstanceOf(InvalidTransitionError);

        store.seedStep(stepId, tenantA, 1, 'SKIPPED');
        await expect(
            service.transitionStep({ tenantId: tenantA, stepId, expectedVersion: 1, status: 'RUNNING' })
        ).rejects.toBeInstanceOf(InvalidTransitionError);
    });
});

const drizzleDescribe = process.env.TEST_DATABASE_URL ? describe : describe.skip;

drizzleDescribe('FrankExecutionCasService (Drizzle)', () => {
    async function insertRun(tenantId: string, status = 'PENDING') {
        const { getDb } = await import('@/infra/db');
        const { frankExecutionRuns } = await import('@/drizzle/schema');
        const db = await getDb();
        const runId = randomUUID();
        await db.insert(frankExecutionRuns).values({
            id: runId,
            tenantId,
            executionId: `exec_${runId}`,
            title: 'CAS test run',
            status,
            autonomyLevel: 'OBSERVE',
            version: 1,
        });
        return runId;
    }

    async function insertStep(tenantId: string, runId: string) {
        const { getDb } = await import('@/infra/db');
        const { frankExecutionSteps } = await import('@/drizzle/schema');
        const db = await getDb();
        const stepId = randomUUID();
        await db.insert(frankExecutionSteps).values({
            id: stepId,
            tenantId,
            executionRunId: runId,
            stepNumber: 1,
            stepName: 'step-1',
            actionType: 'TEST',
            status: 'PENDING',
            version: 1,
        });
        return stepId;
    }

    async function updateRunStatus(runId: string, tenantId: string, status: string) {
        const { getDb } = await import('@/infra/db');
        const { frankExecutionRuns } = await import('@/drizzle/schema');
        const db = await getDb();
        await db
            .update(frankExecutionRuns)
            .set({ status })
            .where(and(eq(frankExecutionRuns.id, runId), eq(frankExecutionRuns.tenantId, tenantId)));
    }

    async function updateStepStatus(stepId: string, tenantId: string, status: string) {
        const { getDb } = await import('@/infra/db');
        const { frankExecutionSteps } = await import('@/drizzle/schema');
        const db = await getDb();
        await db
            .update(frankExecutionSteps)
            .set({ status })
            .where(and(eq(frankExecutionSteps.id, stepId), eq(frankExecutionSteps.tenantId, tenantId)));
    }

    async function readRun(runId: string, tenantId: string) {
        const { getDb } = await import('@/infra/db');
        const { frankExecutionRuns } = await import('@/drizzle/schema');
        const db = await getDb();
        const rows = await db
            .select()
            .from(frankExecutionRuns)
            .where(and(eq(frankExecutionRuns.id, runId), eq(frankExecutionRuns.tenantId, tenantId)));
        return rows[0];
    }

    async function readStep(stepId: string, tenantId: string) {
        const { getDb } = await import('@/infra/db');
        const { frankExecutionSteps } = await import('@/drizzle/schema');
        const db = await getDb();
        const rows = await db
            .select()
            .from(frankExecutionSteps)
            .where(and(eq(frankExecutionSteps.id, stepId), eq(frankExecutionSteps.tenantId, tenantId)));
        return rows[0];
    }

    it('detects concurrent run transitions with same expectedVersion', async () => {
        const runId = await insertRun(tenantA);
        const service = new FrankExecutionCasService(new DrizzleExecutionCasStore());

        const [first, second] = await Promise.allSettled([
            service.transitionRun({ tenantId: tenantA, runId, expectedVersion: 1, status: 'RUNNING' }),
            service.transitionRun({ tenantId: tenantA, runId, expectedVersion: 1, status: 'COMPLETED' }),
        ]);

        const fulfilled = [first, second].filter((r) => r.status === 'fulfilled');
        const rejected = [first, second].filter((r) => r.status === 'rejected');

        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(1);
        expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(VersionConflictError);

        const version = await service.readVersion(tenantA, runId);
        expect(version).toBe(2);
    });

    it('detects concurrent step transitions with same expectedVersion', async () => {
        const runId = await insertRun(tenantA);
        const stepId = await insertStep(tenantA, runId);
        const service = new FrankExecutionCasService(new DrizzleExecutionCasStore());

        const [first, second] = await Promise.allSettled([
            service.transitionStep({ tenantId: tenantA, stepId, expectedVersion: 1, status: 'RUNNING' }),
            service.transitionStep({ tenantId: tenantA, stepId, expectedVersion: 1, status: 'COMPLETED' }),
        ]);

        const fulfilled = [first, second].filter((r) => r.status === 'fulfilled');
        const rejected = [first, second].filter((r) => r.status === 'rejected');

        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(1);
        expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(VersionConflictError);
    });

    it('records turns monotonically and rejects duplicates and regressions', async () => {
        const runId = await insertRun(tenantA);
        const service = new FrankExecutionCasService(new DrizzleExecutionCasStore());

        await service.recordTurn({ tenantId: tenantA, runId, turn: 1, envelope: { n: 1 } });
        await service.recordTurn({ tenantId: tenantA, runId, turn: 2, envelope: { n: 2 } });
        await service.recordTurn({ tenantId: tenantA, runId, turn: 3, envelope: { n: 3 } });

        await expect(
            service.recordTurn({ tenantId: tenantA, runId, turn: 2, envelope: { n: 2 } })
        ).rejects.toBeInstanceOf(DuplicateTurnError);

        await expect(
            service.recordTurn({ tenantId: tenantA, runId, turn: 0, envelope: { n: 0 } })
        ).rejects.toBeInstanceOf(TurnRegressionError);

        const turns = await service.listTurns(tenantA, runId);
        expect(turns.map((t) => t.turn)).toEqual([1, 2, 3]);
    });

    it('enforces tenant isolation on reads, transitions and turns', async () => {
        const runId = await insertRun(tenantA);
        const service = new FrankExecutionCasService(new DrizzleExecutionCasStore());

        await expect(service.readVersion(tenantB, runId)).rejects.toBeInstanceOf(TenantMismatchError);
        await expect(
            service.transitionRun({ tenantId: tenantB, runId, expectedVersion: 1, status: 'RUNNING' })
        ).rejects.toBeInstanceOf(TenantMismatchError);
        await expect(
            service.recordTurn({ tenantId: tenantB, runId, turn: 1, envelope: {} })
        ).rejects.toBeInstanceOf(TenantMismatchError);

        const runB = await insertRun(tenantB);
        await service.recordTurn({ tenantId: tenantA, runId, turn: 1, envelope: { owner: 'A' } });
        await service.recordTurn({ tenantId: tenantB, runId: runB, turn: 1, envelope: { owner: 'B' } });

        const turnsA = await service.listTurns(tenantA, runId);
        expect(turnsA).toHaveLength(1);
        expect(turnsA[0].envelope).toEqual({ owner: 'A' });

        const turnsB = await service.listTurns(tenantB, runB);
        expect(turnsB).toHaveLength(1);
        expect(turnsB[0].envelope).toEqual({ owner: 'B' });

        await expect(service.listTurns(tenantA, runB)).rejects.toBeInstanceOf(TenantMismatchError);
    });

    it('calculates next turn when omitted', async () => {
        const runId = await insertRun(tenantA);
        const service = new FrankExecutionCasService(new DrizzleExecutionCasStore());

        await service.recordTurn({ tenantId: tenantA, runId, envelope: { n: 1 } });
        await service.recordTurn({ tenantId: tenantA, runId, envelope: { n: 2 } });
        await service.recordTurn({ tenantId: tenantA, runId, turn: 5, envelope: { n: 5 } });
        await service.recordTurn({ tenantId: tenantA, runId, envelope: { n: 6 } });

        const turns = await service.listTurns(tenantA, runId);
        expect(turns.map((t) => t.turn)).toEqual([1, 2, 5, 6]);
    });

    it('exactly one concurrent omitted-turn record wins, the other gets DuplicateTurnError', async () => {
        const runId = await insertRun(tenantA);
        const service = new FrankExecutionCasService(new DrizzleExecutionCasStore());

        const [first, second] = await Promise.allSettled([
            service.recordTurn({ tenantId: tenantA, runId, envelope: { n: 1 } }),
            service.recordTurn({ tenantId: tenantA, runId, envelope: { n: 2 } }),
        ]);

        const fulfilled = [first, second].filter((r) => r.status === 'fulfilled');
        const rejected = [first, second].filter((r) => r.status === 'rejected');

        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(1);
        expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(DuplicateTurnError);

        const turns = await service.listTurns(tenantA, runId);
        expect(turns).toHaveLength(1);
        expect(turns[0].turn).toBe(1);
    });

    it('rejects envelope with mismatched tenantId, runId or turn', async () => {
        const runId = await insertRun(tenantA);
        const service = new FrankExecutionCasService(new DrizzleExecutionCasStore());

        await expect(
            service.recordTurn({ tenantId: tenantA, runId, turn: 1, envelope: { tenantId: tenantB } })
        ).rejects.toBeInstanceOf(InvalidEnvelopeError);

        await expect(
            service.recordTurn({ tenantId: tenantA, runId, turn: 1, envelope: { runId: randomUUID() } })
        ).rejects.toBeInstanceOf(InvalidEnvelopeError);

        await expect(
            service.recordTurn({ tenantId: tenantA, runId, turn: 1, envelope: { turn: 2 } })
        ).rejects.toBeInstanceOf(InvalidEnvelopeError);
    });

    it('preserves envelope exactly through serialization round-trip', async () => {
        const runId = await insertRun(tenantA);
        const service = new FrankExecutionCasService(new DrizzleExecutionCasStore());
        const envelope = {
            tenantId: tenantA,
            runId,
            turn: 1,
            nested: { arr: [1, 2, 3], bool: true },
            nullField: null,
        };

        await service.recordTurn({ tenantId: tenantA, runId, turn: 1, envelope });
        const turns = await service.listTurns(tenantA, runId);
        expect(turns).toHaveLength(1);
        expect(turns[0].envelope).toEqual(envelope);
    });

    it('rejects invalid run status and leaves state unchanged', async () => {
        const runId = await insertRun(tenantA, 'PENDING');
        const service = new FrankExecutionCasService(new DrizzleExecutionCasStore());

        await expect(
            service.transitionRun({ tenantId: tenantA, runId, expectedVersion: 1, status: 'NONSENSE' })
        ).rejects.toBeInstanceOf(InvalidTransitionError);

        const run = await readRun(runId, tenantA);
        expect(run.status).toBe('PENDING');
        expect(run.version).toBe(1);
    });

    it('rejects transitions from terminal run statuses', async () => {
        const runId = await insertRun(tenantA, 'COMPLETED');
        const service = new FrankExecutionCasService(new DrizzleExecutionCasStore());

        await expect(
            service.transitionRun({ tenantId: tenantA, runId, expectedVersion: 1, status: 'RUNNING' })
        ).rejects.toBeInstanceOf(InvalidTransitionError);
    });

    it('allows FAILED run to transition', async () => {
        const runId = await insertRun(tenantA, 'FAILED');
        const service = new FrankExecutionCasService(new DrizzleExecutionCasStore());

        await expect(
            service.transitionRun({ tenantId: tenantA, runId, expectedVersion: 1, status: 'RUNNING' })
        ).resolves.toBe(2);
    });

    it('rejects transitions from terminal step statuses', async () => {
        const runId = await insertRun(tenantA);
        const stepId = await insertStep(tenantA, runId);
        await updateStepStatus(stepId, tenantA, 'COMPLETED');
        const service = new FrankExecutionCasService(new DrizzleExecutionCasStore());

        await expect(
            service.transitionStep({ tenantId: tenantA, stepId, expectedVersion: 1, status: 'RUNNING' })
        ).rejects.toBeInstanceOf(InvalidTransitionError);
    });
});
