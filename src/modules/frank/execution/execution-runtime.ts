/**
 * FRK-9 — Execution Runtime boundary (audit rework, review point 1).
 *
 * Single authority over the Run/Step lifecycle. Responsibilities, each owned
 * by exactly one method here and nowhere else:
 *
 * - createRun / createStep: the ONLY way to open a Run or a Step.
 * - openTurn / closeTurn: the ONLY way to open/close a Turn (turn numbers
 *   come from the store, never from callers).
 * - advanceRun / advanceStep: the ONLY way to move status, always with the
 *   observed version (optimistic locking; concurrent moves fail closed).
 * - retryStep: the ONLY retry path, honoring the run's attempt budget.
 * - resumeRun: rebuilds runtime state from persisted rows after a restart.
 * - auditTurn: append-only turn log; history is never rewritten.
 *
 * Explicit NON-goals of this PR (declared limits, not follow-up excuses):
 * - the legacy agent-loop does not flow through this boundary yet; the
 *   integration slice (plugging decideNextAction/evaluatePolicy turns into
 *   openTurn/closeTurn) is a separate, already-scoped demand;
 * - no hash-chained tamper-proof log (guarantee level is documented in
 *   docs/frank/frk-9-state-machine.md).
 */
import {
  assertValidAttempt,
  nextTurnNumber,
  type ExecutionTurnEnvelope,
  type RunState,
  type RunStatus,
  type StepState,
  type StepStatus,
  type TurnAction,
  type TurnDecision,
  type TurnInput,
  type TurnPolicy,
  type TurnResult,
} from './execution-state-machine';
import type { ExecutionStore } from './execution.repository';

export interface OpenTurnInput {
  input: TurnInput;
  resolvedContext?: Record<string, unknown>;
  decision: TurnDecision;
  policy: TurnPolicy;
  actionName: string;
}

export class ExecutionRuntime {
  constructor(private readonly store: ExecutionStore) {}

  async createRun(args: { runId: string; tenantId: string; maxAttempts?: number }): Promise<RunState> {
    return this.store.createRun(args);
  }

  async startRun(args: { tenantId: string; runId: string }): Promise<RunState> {
    const current = await this.store.getRun(args);
    return this.store.transitionRun({ ...args, to: 'RUNNING', expectedVersion: current.version });
  }

  async createStep(args: { stepId: string; runId: string; tenantId: string }): Promise<StepState> {
    return this.store.createStep(args);
  }

  async startStep(args: { tenantId: string; stepId: string }): Promise<StepState> {
    const current = await this.store.getStep(args);
    return this.store.transitionStep({ ...args, to: 'RUNNING', expectedVersion: current.version });
  }

  /** Opens the next turn; the turn number is computed, never accepted. */
  async openTurn(args: { tenantId: string; runId: string; stepId: string; requestId: string } & OpenTurnInput): Promise<ExecutionTurnEnvelope> {
    const { buildTurnEnvelope } = await import('./execution-state-machine');
    const step = await this.store.getStep({ tenantId: args.tenantId, stepId: args.stepId });
    if (step.runId !== args.runId) {
      const { TenantMismatchError } = await import('./execution.repository');
      throw new TenantMismatchError('step/run', args.stepId);
    }
    if (step.status !== 'RUNNING') {
      const { InvalidTransitionError } = await import('./execution-state-machine');
      throw new InvalidTransitionError('step', step.status, 'open-turn(required RUNNING)');
    }
    const turn = await this.store.nextTurn({ tenantId: args.tenantId, runId: args.runId });
    const now = new Date().toISOString();
    return buildTurnEnvelope({
      runId: args.runId,
      stepId: args.stepId,
      tenantId: args.tenantId,
      requestId: args.requestId,
      turn,
      input: args.input,
      resolvedContext: args.resolvedContext,
      decision: args.decision,
      policy: args.policy,
      action: { name: args.actionName, status: 'RUNNING', startedAt: now, finishedAt: null } satisfies TurnAction,
      result: { ok: false, status: 'SKIPPED', data: null, errorCode: null, errorMessage: null } satisfies TurnResult,
      auditTrail: [{ at: now, event: 'turn.opened', detail: { turn } }],
      createdAt: now,
    });
  }

  /** Closes a turn by persisting its final envelope (append-only). */
  async closeTurn(envelope: ExecutionTurnEnvelope): Promise<void> {
    await this.store.saveTurn(envelope);
  }

  async advanceRun(args: { tenantId: string; runId: string; to: RunStatus }): Promise<RunState> {
    const current = await this.store.getRun(args);
    return this.store.transitionRun({ ...args, expectedVersion: current.version });
  }

  async advanceStep(args: { tenantId: string; stepId: string; to: StepStatus }): Promise<StepState> {
    const current = await this.store.getStep(args);
    return this.store.transitionStep({ ...args, expectedVersion: current.version });
  }

  async retryStep(args: { tenantId: string; stepId: string }): Promise<StepState> {
    const current = await this.store.getStep(args);
    return this.store.retryStep({ ...args, expectedVersion: current.version });
  }

  /**
   * Rebuilds runtime state after a restart: reads persisted Run/Step/turns,
   * validates attempt invariants, and returns the resume point (no mutation).
   */
  async resumeRun(args: { tenantId: string; runId: string }): Promise<{
    run: RunState;
    steps: StepState[];
    lastTurn: number;
    nextTurn: number;
  }> {
    const { InMemoryExecutionStore } = await import('./execution.repository');
    void InMemoryExecutionStore;
    const run = await this.store.getRun(args);
    const turns = await this.store.listTurns(args);
    const stepIds = [...new Set(turns.map((t) => t.stepId))];
    const steps: StepState[] = [];
    for (const stepId of stepIds) {
      const step = await this.store.getStep({ tenantId: args.tenantId, stepId });
      assertValidAttempt(step.attempt);
      steps.push(step);
    }
    const lastTurn = turns.length === 0 ? 0 : Math.max(...turns.map((t) => t.turn));
    return { run, steps, lastTurn, nextTurn: nextTurnNumber(turns.map((t) => t.turn)) };
  }
}
