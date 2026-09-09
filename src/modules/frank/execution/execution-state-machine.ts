/**
 * FRK-9 — Execution State Machine (Run / Step).
 *
 * Deterministic, pure (no DB/network) transition tables for the Frank
 * Execution Runtime. Any invalid transition throws InvalidTransitionError
 * instead of silently succeeding.
 *
 * OBSERVE (2026-09-09): today Run/Step do not exist as persisted entities.
 * - `agent-loop.ts` is stateless: decideNextAction + evaluatePolicy +
 *   runFrankAgentTool return ephemeral ToolResult (BLOCKED_BY_POLICY /
 *   EXECUTED / FAILED), no Run record.
 * - `session.repository.ts` (frank_session_state) keeps free-string
 *   currentIntent/currentStep — not a state machine.
 * - `tools/tool-runner.ts` + `tool-policy.ts` gate single tool calls.
 * - `workers/frank-worker.ts` polls incoming_messages, no execution record.
 * - `src/core/conversation/state-machine.ts` models *dialog* states
 *   (IDLE/AWAITING_CEP/…), not execution lifecycle.
 * This module formalizes the *execution* lifecycle on top of those pieces.
 */

export type RunStatus =
  | 'CREATED'
  | 'RUNNING'
  | 'PAUSED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED';

export type StepStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'RETRYING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'SKIPPED'
  | 'CANCELLED';

export const RUN_TERMINAL: ReadonlySet<RunStatus> = new Set([
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
]);

export const STEP_TERMINAL: ReadonlySet<StepStatus> = new Set([
  'SUCCEEDED',
  'FAILED',
  'SKIPPED',
  'CANCELLED',
]);

const RUN_TRANSITIONS: Readonly<Record<RunStatus, ReadonlySet<RunStatus>>> = {
  CREATED: new Set(['RUNNING', 'CANCELLED']),
  RUNNING: new Set(['PAUSED', 'SUCCEEDED', 'FAILED', 'CANCELLED']),
  PAUSED: new Set(['RUNNING', 'FAILED', 'CANCELLED']),
  SUCCEEDED: new Set([]),
  FAILED: new Set([]),
  CANCELLED: new Set([]),
};

const STEP_TRANSITIONS: Readonly<Record<StepStatus, ReadonlySet<StepStatus>>> = {
  PENDING: new Set(['RUNNING', 'SKIPPED', 'CANCELLED']),
  RUNNING: new Set(['SUCCEEDED', 'FAILED', 'SKIPPED', 'CANCELLED']),
  RETRYING: new Set(['RUNNING', 'FAILED', 'CANCELLED']),
  FAILED: new Set(['RETRYING', 'CANCELLED']),
  SUCCEEDED: new Set([]),
  SKIPPED: new Set([]),
  CANCELLED: new Set([]),
};

export class InvalidTransitionError extends Error {
  readonly entity: 'run' | 'step';
  readonly from: string;
  readonly to: string;

  constructor(entity: 'run' | 'step', from: string, to: string) {
    super(`invalid_${entity}_transition: ${from} -> ${to}`);
    this.name = 'InvalidTransitionError';
    this.entity = entity;
    this.from = from;
    this.to = to;
  }
}

export function canTransitionRun(from: RunStatus, to: RunStatus): boolean {
  return RUN_TRANSITIONS[from]?.has(to) ?? false;
}

export function canTransitionStep(from: StepStatus, to: StepStatus): boolean {
  return STEP_TRANSITIONS[from]?.has(to) ?? false;
}

export function assertRunTransition(from: RunStatus, to: RunStatus): void {
  if (!canTransitionRun(from, to)) {
    throw new InvalidTransitionError('run', from, to);
  }
}

export function assertStepTransition(from: StepStatus, to: StepStatus): void {
  if (!canTransitionStep(from, to)) {
    throw new InvalidTransitionError('step', from, to);
  }
}

export interface RunState {
  runId: string;
  status: RunStatus;
  updatedAt: string;
}

export interface StepState {
  stepId: string;
  runId: string;
  status: StepStatus;
  attempt: number;
  updatedAt: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Pure transition: returns the next state or throws InvalidTransitionError. */
export function transitionRun(current: RunState, to: RunStatus, at = nowIso()): RunState {
  assertRunTransition(current.status, to);
  return { ...current, status: to, updatedAt: at };
}

/**
 * Pure step transition. Entering RETRYING bumps the attempt counter;
 * leaving RETRYING for RUNNING keeps the bumped attempt.
 */
export function transitionStep(current: StepState, to: StepStatus, at = nowIso()): StepState {
  assertStepTransition(current.status, to);
  const attempt = to === 'RETRYING' ? current.attempt + 1 : current.attempt;
  return { ...current, status: to, attempt, updatedAt: at };
}

// ─── Execution Turn Envelope ────────────────────────────────────────────────
// Spec: input, contexto resolvido, decisão, policy, ação, resultado, trilha auditável.

export interface TurnInput {
  action: string;
  params?: Record<string, unknown>;
}

export interface TurnDecision {
  plannedAction: string;
  subAgent?: string;
  handoff?: string | null;
}

export interface TurnPolicy {
  riskLevel: 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK';
  allowed: boolean;
  reason?: string | null;
}

export interface TurnAction {
  name: string;
  status: StepStatus;
  startedAt: string;
  finishedAt?: string | null;
}

export interface TurnResult {
  ok: boolean;
  status: 'EXECUTED' | 'BLOCKED_BY_POLICY' | 'FAILED' | 'SKIPPED';
  data?: unknown;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export interface AuditEvent {
  at: string;
  event: string;
  detail?: Record<string, unknown> | null;
}

export interface ExecutionTurnEnvelope {
  runId: string;
  stepId: string;
  tenantId: string;
  requestId: string;
  turn: number;
  input: TurnInput;
  resolvedContext: Record<string, unknown>;
  decision: TurnDecision;
  policy: TurnPolicy;
  action: TurnAction;
  result: TurnResult;
  auditTrail: AuditEvent[];
  createdAt: string;
}

export class InvalidEnvelopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidEnvelopeError';
  }
}

export function buildTurnEnvelope(args: {
  runId: string;
  stepId: string;
  tenantId: string;
  requestId: string;
  turn: number;
  input: TurnInput;
  resolvedContext?: Record<string, unknown>;
  decision: TurnDecision;
  policy: TurnPolicy;
  action: TurnAction;
  result: TurnResult;
  auditTrail?: AuditEvent[];
  createdAt?: string;
}): ExecutionTurnEnvelope {
  const {
    runId,
    stepId,
    tenantId,
    requestId,
    turn,
    input,
    decision,
    policy,
    action,
    result,
  } = args;

  if (!runId || !stepId || !tenantId || !requestId) {
    throw new InvalidEnvelopeError('runId, stepId, tenantId and requestId are required');
  }
  if (!Number.isInteger(turn) || turn < 1) {
    throw new InvalidEnvelopeError('turn must be an integer >= 1');
  }
  if (!input?.action) {
    throw new InvalidEnvelopeError('input.action is required');
  }
  // Deterministic invariants: the envelope must not claim success when
  // policy blocked the action, nor claim a terminal step without a result.
  if (!policy.allowed && result.ok) {
    throw new InvalidEnvelopeError('result.ok must be false when policy.allowed is false');
  }
  if (!policy.allowed && result.status === 'EXECUTED') {
    throw new InvalidEnvelopeError("result.status must not be EXECUTED when policy blocked it");
  }
  if (STEP_TERMINAL.has(action.status) && !result) {
    throw new InvalidEnvelopeError('terminal step requires a result');
  }

  const createdAt = args.createdAt ?? nowIso();
  return {
    runId,
    stepId,
    tenantId,
    requestId,
    turn,
    input: { action: input.action, params: input.params ?? {} },
    resolvedContext: args.resolvedContext ?? {},
    decision: {
      plannedAction: decision.plannedAction,
      subAgent: decision.subAgent,
      handoff: decision.handoff ?? null,
    },
    policy: { riskLevel: policy.riskLevel, allowed: policy.allowed, reason: policy.reason ?? null },
    action: {
      name: action.name,
      status: action.status,
      startedAt: action.startedAt,
      finishedAt: action.finishedAt ?? null,
    },
    result: {
      ok: result.ok,
      status: result.status,
      data: result.data,
      errorCode: result.errorCode ?? null,
      errorMessage: result.errorMessage ?? null,
    },
    auditTrail: args.auditTrail ?? [
      { at: createdAt, event: 'turn.envelope.created', detail: { turn } },
    ],
    createdAt,
  };
}

/** Immutable append to the auditable trail. */
export function appendAuditEvent(
  envelope: ExecutionTurnEnvelope,
  event: string,
  detail?: Record<string, unknown> | null,
  at = nowIso(),
): ExecutionTurnEnvelope {
  return {
    ...envelope,
    auditTrail: [...envelope.auditTrail, { at, event, detail: detail ?? null }],
  };
}
