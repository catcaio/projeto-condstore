import { describe, it, expect } from 'vitest';
import {
  canTransitionRun,
  canTransitionStep,
  transitionRun,
  transitionStep,
  buildTurnEnvelope,
  appendAuditEvent,
  InvalidTransitionError,
  InvalidEnvelopeError,
  type RunStatus,
  type StepStatus,
} from '../execution-state-machine';
import { InMemoryExecutionStore } from '../execution.repository';

const RUN_VALID: Array<[RunStatus, RunStatus]> = [
  ['CREATED', 'RUNNING'],
  ['CREATED', 'CANCELLED'],
  ['RUNNING', 'PAUSED'],
  ['RUNNING', 'SUCCEEDED'],
  ['RUNNING', 'FAILED'],
  ['RUNNING', 'CANCELLED'],
  ['PAUSED', 'RUNNING'],
  ['PAUSED', 'FAILED'],
  ['PAUSED', 'CANCELLED'],
];

const RUN_INVALID: Array<[RunStatus, RunStatus]> = [
  ['CREATED', 'SUCCEEDED'],
  ['CREATED', 'FAILED'],
  ['CREATED', 'PAUSED'],
  ['RUNNING', 'CREATED'],
  ['PAUSED', 'SUCCEEDED'],
  ['PAUSED', 'CREATED'],
  ['SUCCEEDED', 'RUNNING'],
  ['FAILED', 'RUNNING'],
  ['CANCELLED', 'RUNNING'],
  ['SUCCEEDED', 'CANCELLED'],
];

const STEP_VALID: Array<[StepStatus, StepStatus]> = [
  ['PENDING', 'RUNNING'],
  ['PENDING', 'SKIPPED'],
  ['PENDING', 'CANCELLED'],
  ['RUNNING', 'SUCCEEDED'],
  ['RUNNING', 'FAILED'],
  ['RUNNING', 'SKIPPED'],
  ['RUNNING', 'CANCELLED'],
  ['FAILED', 'RETRYING'],
  ['FAILED', 'CANCELLED'],
  ['RETRYING', 'RUNNING'],
  ['RETRYING', 'FAILED'],
  ['RETRYING', 'CANCELLED'],
];

const STEP_INVALID: Array<[StepStatus, StepStatus]> = [
  ['PENDING', 'SUCCEEDED'],
  ['PENDING', 'FAILED'],
  ['PENDING', 'RETRYING'],
  ['RUNNING', 'PENDING'],
  ['RUNNING', 'RETRYING'],
  ['SUCCEEDED', 'RUNNING'],
  ['SUCCEEDED', 'RETRYING'],
  ['SKIPPED', 'RUNNING'],
  ['CANCELLED', 'RUNNING'],
  ['FAILED', 'SUCCEEDED'],
  ['RETRYING', 'SUCCEEDED'],
  ['RETRYING', 'PENDING'],
];

function baseEnvelope(overrides = {}) {
  return {
    runId: 'run-1',
    stepId: 'step-1',
    tenantId: 'tenant-1',
    requestId: 'req-1',
    turn: 1,
    input: { action: 'READ_QUOTE_CONTEXT' as string, params: {} },
    resolvedContext: { quoteStatus: 'DRAFT' },
    decision: { plannedAction: 'READ_QUOTE_CONTEXT', subAgent: 'FREIGHT' },
    policy: { riskLevel: 'LOW_RISK' as const, allowed: true },
    action: {
      name: 'READ_QUOTE_CONTEXT',
      status: 'SUCCEEDED' as StepStatus,
      startedAt: new Date().toISOString(),
    },
    result: { ok: true, status: 'EXECUTED' as const, data: { quoteId: 'q-1' } },
    ...overrides,
  };
}

describe('FRK-9 run state machine', () => {
  it.each(RUN_VALID)('accepts %s -> %s', (from, to) => {
    expect(canTransitionRun(from, to)).toBe(true);
    const next = transitionRun({ runId: 'r', status: from, updatedAt: 't' }, to, 'now');
    expect(next.status).toBe(to);
  });

  it.each(RUN_INVALID)('rejects %s -> %s', (from, to) => {
    expect(canTransitionRun(from, to)).toBe(false);
    expect(() => transitionRun({ runId: 'r', status: from, updatedAt: 't' }, to)).toThrow(
      InvalidTransitionError,
    );
  });
});

describe('FRK-9 step state machine', () => {
  it.each(STEP_VALID)('accepts %s -> %s', (from, to) => {
    expect(canTransitionStep(from, to)).toBe(true);
    const next = transitionStep(
      { stepId: 's', runId: 'r', status: from, attempt: 1, updatedAt: 't' },
      to,
      'now',
    );
    expect(next.status).toBe(to);
  });

  it.each(STEP_INVALID)('rejects %s -> %s', (from, to) => {
    expect(canTransitionStep(from, to)).toBe(false);
    expect(() =>
      transitionStep({ stepId: 's', runId: 'r', status: from, attempt: 1, updatedAt: 't' }, to),
    ).toThrow(InvalidTransitionError);
  });

  it('bumps attempt when entering RETRYING', () => {
    const next = transitionStep(
      { stepId: 's', runId: 'r', status: 'FAILED', attempt: 1, updatedAt: 't' },
      'RETRYING',
      'now',
    );
    expect(next.attempt).toBe(2);
  });
});

describe('FRK-9 execution turn envelope', () => {
  it('builds a valid envelope with default audit event', () => {
    const env = buildTurnEnvelope(baseEnvelope());
    expect(env.runId).toBe('run-1');
    expect(env.auditTrail).toHaveLength(1);
    expect(env.auditTrail[0]?.event).toBe('turn.envelope.created');
  });

  it('rejects ok=true when policy blocked', () => {
    expect(() =>
      buildTurnEnvelope(
        baseEnvelope({
          policy: { riskLevel: 'HIGH_RISK', allowed: false, reason: 'missing_human_approval_token' },
          result: { ok: true, status: 'EXECUTED' },
        }),
      ),
    ).toThrow(InvalidEnvelopeError);
  });

  it('rejects EXECUTED result when policy blocked', () => {
    expect(() =>
      buildTurnEnvelope(
        baseEnvelope({
          policy: { riskLevel: 'HIGH_RISK', allowed: false },
          result: { ok: false, status: 'EXECUTED' },
        }),
      ),
    ).toThrow(InvalidEnvelopeError);
  });

  it('rejects missing ids and invalid turn', () => {
    expect(() => buildTurnEnvelope(baseEnvelope({ runId: '' }))).toThrow(InvalidEnvelopeError);
    expect(() => buildTurnEnvelope(baseEnvelope({ turn: 0 }))).toThrow(InvalidEnvelopeError);
  });

  it('appends audit events immutably', () => {
    const env = buildTurnEnvelope(baseEnvelope());
    const next = appendAuditEvent(env, 'turn.step.succeeded', { step: 'step-1' }, 't2');
    expect(next.auditTrail).toHaveLength(2);
    expect(env.auditTrail).toHaveLength(1);
  });

  it('persists turns in the in-memory store per run', async () => {
    const store = new InMemoryExecutionStore();
    const env = buildTurnEnvelope(baseEnvelope());
    await store.saveTurn(env);
    await store.saveTurn(buildTurnEnvelope(baseEnvelope({ stepId: 'step-2', turn: 2 })));
    const turns = await store.listTurns('run-1');
    expect(turns).toHaveLength(2);
    expect(await store.listTurns('other-run')).toHaveLength(0);
  });
});
