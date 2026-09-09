/**
 * FRK-9 — property tests for the execution lifecycle (audit rework).
 *
 * In-memory suite runs everywhere. The Drizzle suite runs only when
 * TEST_DATABASE_URL is set (local MySQL/TiDB); otherwise it skips loudly
 * instead of pretending persistence was validated.
 */
import { describe, it, expect } from 'vitest';
import {
  canTransitionRun,
  canTransitionStep,
  transitionRun,
  transitionStep,
  buildTurnEnvelope,
  appendAuditEvent,
  nextTurnNumber,
  isStepRetryable,
  assertValidAttempt,
  InvalidTransitionError,
  RUN_TERMINAL,
  STEP_TERMINAL,
  type ExecutionTurnEnvelope,
} from '../execution-state-machine';
import {
  InMemoryExecutionStore,
  DuplicateTurnError,
  TenantMismatchError,
  TurnRegressionError,
  UnknownEntityError,
  VersionConflictError,
  RetryBudgetExhaustedError,
  type ExecutionStore,
} from '../execution.repository';
import { ExecutionRuntime } from '../execution-runtime';

const TENANT = 'tenant-a';
const OTHER_TENANT = 'tenant-b';

function makeEnvelope(overrides: Partial<ExecutionTurnEnvelope> = {}): ExecutionTurnEnvelope {
  return buildTurnEnvelope({
    runId: 'run-1',
    stepId: 'step-1',
    tenantId: TENANT,
    requestId: 'req-1',
    turn: 1,
    input: { action: 'quote.create' },
    decision: { plannedAction: 'quote.create' },
    policy: { riskLevel: 'LOW_RISK', allowed: true },
    action: { name: 'quote.create', status: 'SUCCEEDED', startedAt: '2026-09-09T00:00:00.000Z', finishedAt: '2026-09-09T00:00:01.000Z' },
    result: { ok: true, status: 'EXECUTED', data: { id: 1 } },
    ...overrides,
  });
}

async function seededStore(): Promise<InMemoryExecutionStore> {
  const store = new InMemoryExecutionStore();
  await store.createRun({ runId: 'run-1', tenantId: TENANT, maxAttempts: 2 });
  await store.createStep({ stepId: 'step-1', runId: 'run-1', tenantId: TENANT });
  return store;
}

describe('transition tables', () => {
  it('invalid run transition never mutates the original object', () => {
    const before = { runId: 'r', tenantId: TENANT, status: 'SUCCEEDED' as const, version: 5, updatedAt: 't' };
    expect(() => transitionRun(before, 'RUNNING')).toThrow(InvalidTransitionError);
    expect(before).toEqual({ runId: 'r', tenantId: TENANT, status: 'SUCCEEDED', version: 5, updatedAt: 't' });
  });

  it('run terminals never advance', () => {
    for (const terminal of RUN_TERMINAL) {
      for (const to of ['CREATED', 'RUNNING', 'PAUSED', 'SUCCEEDED', 'FAILED', 'CANCELLED'] as const) {
        expect(canTransitionRun(terminal, to)).toBe(false);
      }
    }
  });

  it('step terminals never advance; FAILED step is retry-eligible, not terminal', () => {
    expect(STEP_TERMINAL.has('FAILED')).toBe(false);
    for (const terminal of STEP_TERMINAL) {
      for (const to of ['PENDING', 'RUNNING', 'RETRYING', 'SUCCEEDED', 'FAILED', 'SKIPPED', 'CANCELLED'] as const) {
        expect(canTransitionStep(terminal, to)).toBe(false);
      }
    }
    expect(canTransitionStep('FAILED', 'RETRYING')).toBe(true);
  });

  it('retry increments attempt; budget gates it', () => {
    const s0 = { stepId: 's', runId: 'r', tenantId: TENANT, status: 'FAILED' as const, attempt: 1, version: 1, updatedAt: 't' };
    expect(isStepRetryable(s0, 2)).toBe(true);
    const s1 = transitionStep(s0, 'RETRYING');
    expect(s1.attempt).toBe(2);
    expect(isStepRetryable({ ...s1, status: 'FAILED' }, 2)).toBe(false);
  });

  it('attempt invariants: rejects 0, negative and non-integer', () => {
    expect(() => assertValidAttempt(0)).toThrow(RangeError);
    expect(() => assertValidAttempt(-1)).toThrow(RangeError);
    expect(() => assertValidAttempt(1.5)).toThrow(RangeError);
    expect(() => assertValidAttempt(Number.NaN)).toThrow(RangeError);
  });

  it('nextTurnNumber is strictly max+1', () => {
    expect(nextTurnNumber([])).toBe(1);
    expect(nextTurnNumber([1, 3, 2])).toBe(4);
  });
});

describe('store boundaries (in-memory, same enforcement as Drizzle)', () => {
  it('duplicate turn is rejected; original history untouched', async () => {
    const store = await seededStore();
    await store.saveTurn(makeEnvelope());
    await expect(store.saveTurn(makeEnvelope())).rejects.toThrow(DuplicateTurnError);
    expect((await store.listTurns({ tenantId: TENANT, runId: 'run-1' })).length).toBe(1);
  });

  it('turn regression is rejected', async () => {
    const store = await seededStore();
    await store.saveTurn(makeEnvelope({ turn: 2 }));
    await expect(store.saveTurn(makeEnvelope({ turn: 1 }))).rejects.toThrow(TurnRegressionError);
  });

  it('cross-tenant read fails closed', async () => {
    const store = await seededStore();
    await store.saveTurn(makeEnvelope());
    await expect(store.getRun({ tenantId: OTHER_TENANT, runId: 'run-1' })).rejects.toThrow(TenantMismatchError);
    await expect(store.listTurns({ tenantId: OTHER_TENANT, runId: 'run-1' })).rejects.toThrow(TenantMismatchError);
  });

  it('tenant cannot change mid-run: foreign step rejected', async () => {
    const store = await seededStore();
    const evil = makeEnvelope({ stepId: 'step-evil' });
    await expect(store.saveTurn(evil)).rejects.toThrow(UnknownEntityError);
  });

  it('version conflict on concurrent advance', async () => {
    const store = await seededStore();
    await store.transitionRun({ tenantId: TENANT, runId: 'run-1', to: 'RUNNING', expectedVersion: 1 });
    await expect(
      store.transitionRun({ tenantId: TENANT, runId: 'run-1', to: 'PAUSED', expectedVersion: 1 }),
    ).rejects.toThrow(VersionConflictError);
    expect((await store.getRun({ tenantId: TENANT, runId: 'run-1' })).status).toBe('RUNNING');
  });

  it('retry budget exhausted deterministically', async () => {
    const store = await seededStore();
    await store.transitionStep({ tenantId: TENANT, stepId: 'step-1', to: 'RUNNING', expectedVersion: 1 });
    await store.transitionStep({ tenantId: TENANT, stepId: 'step-1', to: 'FAILED', expectedVersion: 2 });
    const retried = await store.retryStep({ tenantId: TENANT, stepId: 'step-1', expectedVersion: 3 });
    expect(retried.attempt).toBe(2);
    await store.transitionStep({ tenantId: TENANT, stepId: 'step-1', to: 'RUNNING', expectedVersion: 4 });
    await store.transitionStep({ tenantId: TENANT, stepId: 'step-1', to: 'FAILED', expectedVersion: 5 });
    await expect(store.retryStep({ tenantId: TENANT, stepId: 'step-1', expectedVersion: 6 })).rejects.toThrow(
      RetryBudgetExhaustedError,
    );
  });

  it('hand-made envelope violating invariants is rejected at the boundary', async () => {
    const store = await seededStore();
    const bad = { ...makeEnvelope(), policy: { riskLevel: 'LOW_RISK' as const, allowed: false }, result: { ok: true, status: 'EXECUTED' as const } };
    await expect(store.saveTurn(bad)).rejects.toThrow();
  });

  it('envelope is not mutated by save; listing is turn-ordered', async () => {
    const store = await seededStore();
    const env = makeEnvelope({ turn: 1 });
    await store.saveTurn(env);
    await store.saveTurn(makeEnvelope({ turn: 2, requestId: 'req-2' }));
    expect(env.auditTrail.length).toBe(1);
    const listed = await store.listTurns({ tenantId: TENANT, runId: 'run-1' });
    expect(listed.map((t) => t.turn)).toEqual([1, 2]);
  });

  it('appendAuditEvent does not mutate the original', () => {
    const env = makeEnvelope();
    const next = appendAuditEvent(env, 'turn.closed');
    expect(env.auditTrail.length).toBe(1);
    expect(next.auditTrail.length).toBe(2);
  });
});

describe('runtime boundary', () => {
  it('openTurn computes turn; closeTurn persists; resume rebuilds', async () => {
    const store: ExecutionStore = new InMemoryExecutionStore();
    const runtime = new ExecutionRuntime(store);
    await runtime.createRun({ runId: 'run-9', tenantId: TENANT });
    await runtime.startRun({ tenantId: TENANT, runId: 'run-9' });
    await runtime.createStep({ stepId: 'step-9', runId: 'run-9', tenantId: TENANT });
    await runtime.startStep({ tenantId: TENANT, stepId: 'step-9' });
    const opened = await runtime.openTurn({
      tenantId: TENANT,
      runId: 'run-9',
      stepId: 'step-9',
      requestId: 'req-9',
      input: { action: 'quote.create' },
      decision: { plannedAction: 'quote.create' },
      policy: { riskLevel: 'LOW_RISK', allowed: true },
      actionName: 'quote.create',
    });
    expect(opened.turn).toBe(1);
    await runtime.closeTurn({ ...opened, result: { ok: true, status: 'EXECUTED', data: null } });
    const resumed = await runtime.resumeRun({ tenantId: TENANT, runId: 'run-9' });
    expect(resumed.lastTurn).toBe(1);
    expect(resumed.nextTurn).toBe(2);
    expect(resumed.steps.length).toBe(1);
  });
});

const describeDrizzle = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeDrizzle('drizzle store (MySQL, TEST_DATABASE_URL)', () => {
  it('full lifecycle with optimistic locking and tenant isolation', async () => {
    const { DrizzleExecutionStore } = await import('../execution.repository');
    const store = new DrizzleExecutionStore();
    const tenant = `tenant-test-${Date.now()}`;
    const runId = `run-test-${Date.now()}`;
    const stepId = `step-test-${Date.now()}`;
    const run = await store.createRun({ runId, tenantId: tenant, maxAttempts: 1 });
    expect(run.version).toBe(1);
    await store.createStep({ stepId, runId, tenantId: tenant });
    const moved = await store.transitionStep({ tenantId: tenant, stepId, to: 'RUNNING', expectedVersion: 1 });
    expect(moved.version).toBe(2);
    await expect(
      store.transitionStep({ tenantId: tenant, stepId, to: 'SUCCEEDED', expectedVersion: 1 }),
    ).rejects.toThrow(VersionConflictError);
    const turn = await store.nextTurn({ tenantId: tenant, runId });
    expect(turn).toBe(1);
    const { buildTurnEnvelope: build } = await import('../execution-state-machine');
    const now = new Date().toISOString();
    await store.saveTurn(
      build({
        runId,
        stepId,
        tenantId: tenant,
        requestId: 'req-it',
        turn,
        input: { action: 'it.probe' },
        decision: { plannedAction: 'it.probe' },
        policy: { riskLevel: 'LOW_RISK', allowed: true },
        action: { name: 'it.probe', status: 'SUCCEEDED', startedAt: now, finishedAt: now },
        result: { ok: true, status: 'EXECUTED', data: { ok: 1 } },
      }),
    );
    const listed = await store.listTurns({ tenantId: tenant, runId });
    expect(listed.length).toBe(1);
    expect(listed[0].turn).toBe(1);
    await expect(store.listTurns({ tenantId: 'tenant-stranger', runId })).rejects.toThrow(TenantMismatchError);
  });
});
