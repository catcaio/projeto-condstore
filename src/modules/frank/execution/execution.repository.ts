/**
 * FRK-9 — Execution persistence (audit rework).
 *
 * Operational state (frank_runs / frank_steps) is separated from the
 * append-only turn log (frank_turns). Concurrency is governed by optimistic
 * locking: every advance is conditional on the observed version, so two
 * workers can never move the same Run/Step forward twice — the loser gets
 * VersionConflictError deterministically. Every read and write is
 * tenant-scoped; cross-tenant access fails closed with TenantMismatchError.
 *
 * Guarantee levels (precise, see docs/frank/frk-9-state-machine.md):
 * - in-memory objects: functionally immutable (builders return new objects);
 * - persisted history: append-only + UNIQUE(run_id, turn) + version CAS;
 * - no hash chain: this PR does NOT claim tamper-proof audit trail.
 */
import {
  assertStepTransition,
  assertRunTransition,
  assertValidAttempt,
  buildTurnEnvelope,
  isStepRetryable,
  nextTurnNumber,
  type ExecutionTurnEnvelope,
  type RunState,
  type RunStatus,
  type StepState,
  type StepStatus,
} from './execution-state-machine';

export class VersionConflictError extends Error {
  constructor(entity: string, id: string, expectedVersion: number) {
    super(`${entity} ${id} already advanced past version ${expectedVersion}`);
    this.name = 'VersionConflictError';
  }
}

export class TenantMismatchError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} ${id} does not belong to the requesting tenant`);
    this.name = 'TenantMismatchError';
  }
}

export class UnknownEntityError extends Error {
  constructor(entity: string, id: string) {
    super(`unknown ${entity}: ${id}`);
    this.name = 'UnknownEntityError';
  }
}

export class DuplicateTurnError extends Error {
  constructor(runId: string, turn: number) {
    super(`duplicate turn ${turn} for run ${runId}`);
    this.name = 'DuplicateTurnError';
  }
}

export class TurnRegressionError extends Error {
  constructor(runId: string, turn: number, maxTurn: number) {
    super(`turn ${turn} regresses run ${runId} (max stored turn ${maxTurn})`);
    this.name = 'TurnRegressionError';
  }
}

export class RetryBudgetExhaustedError extends Error {
  constructor(stepId: string, attempt: number, maxAttempts: number) {
    super(`step ${stepId} exhausted retries (attempt ${attempt}/${maxAttempts})`);
    this.name = 'RetryBudgetExhaustedError';
  }
}

export interface ExecutionStore {
  createRun(args: { runId: string; tenantId: string; maxAttempts?: number }): Promise<RunState>;
  getRun(args: { tenantId: string; runId: string }): Promise<RunState>;
  /** Conditional advance: fails with VersionConflictError on concurrent move. */
  transitionRun(args: { tenantId: string; runId: string; to: RunStatus; expectedVersion: number }): Promise<RunState>;
  createStep(args: { stepId: string; runId: string; tenantId: string }): Promise<StepState>;
  getStep(args: { tenantId: string; stepId: string }): Promise<StepState>;
  transitionStep(args: { tenantId: string; stepId: string; to: StepStatus; expectedVersion: number }): Promise<StepState>;
  /** FAILED -> RETRYING honoring the run's attempt budget. */
  retryStep(args: { tenantId: string; stepId: string; expectedVersion: number }): Promise<StepState>;
  /** Revalidates the envelope at the boundary; rejects duplicates/regressions. */
  saveTurn(envelope: ExecutionTurnEnvelope): Promise<void>;
  listTurns(args: { tenantId: string; runId: string }): Promise<ExecutionTurnEnvelope[]>;
  nextTurn(args: { tenantId: string; runId: string }): Promise<number>;
}

// ─── Shared boundary validation (never trust the caller) ────────────────────

function revalidateEnvelope(envelope: ExecutionTurnEnvelope): ExecutionTurnEnvelope {
  // Rebuild through the canonical builder: any hand-made envelope that
  // violates invariants is rejected here, at the persistence boundary.
  return buildTurnEnvelope({
    runId: envelope.runId,
    stepId: envelope.stepId,
    tenantId: envelope.tenantId,
    requestId: envelope.requestId,
    turn: envelope.turn,
    input: envelope.input,
    resolvedContext: envelope.resolvedContext,
    decision: envelope.decision,
    policy: envelope.policy,
    action: envelope.action,
    result: envelope.result,
    auditTrail: envelope.auditTrail,
    createdAt: envelope.createdAt,
  });
}

// ─── In-memory store (same enforcement, zero infra) ─────────────────────────

interface StoredRun extends RunState {
  maxAttempts: number;
}

export class InMemoryExecutionStore implements ExecutionStore {
  private runs = new Map<string, StoredRun>();
  private steps = new Map<string, StepState>();
  private turns: ExecutionTurnEnvelope[] = [];

  async createRun(args: { runId: string; tenantId: string; maxAttempts?: number }): Promise<RunState> {
    requireId(args.runId, args.tenantId);
    if (this.runs.has(args.runId)) throw new DuplicateTurnError(args.runId, 0);
    const now = new Date().toISOString();
    const run: StoredRun = {
      runId: args.runId,
      tenantId: args.tenantId,
      status: 'CREATED',
      version: 1,
      maxAttempts: args.maxAttempts ?? 3,
      updatedAt: now,
    };
    this.runs.set(args.runId, run);
    return stripRun(run);
  }

  async getRun(args: { tenantId: string; runId: string }): Promise<RunState> {
    return stripRun(this.requireRun(args.tenantId, args.runId));
  }

  async transitionRun(args: { tenantId: string; runId: string; to: RunStatus; expectedVersion: number }): Promise<RunState> {
    const run = this.requireRun(args.tenantId, args.runId);
    assertRunTransition(run.status, args.to);
    if (run.version !== args.expectedVersion) {
      throw new VersionConflictError('run', args.runId, args.expectedVersion);
    }
    run.status = args.to;
    run.version += 1;
    run.updatedAt = new Date().toISOString();
    return stripRun(run);
  }

  async createStep(args: { stepId: string; runId: string; tenantId: string }): Promise<StepState> {
    requireId(args.stepId, args.tenantId);
    const run = this.requireRun(args.tenantId, args.runId);
    if (this.steps.has(args.stepId)) throw new DuplicateTurnError(args.stepId, 0);
    const now = new Date().toISOString();
    const step: StepState = {
      stepId: args.stepId,
      runId: run.runId,
      tenantId: args.tenantId,
      status: 'PENDING',
      attempt: 1,
      version: 1,
      updatedAt: now,
    };
    this.steps.set(args.stepId, step);
    return { ...step };
  }

  async getStep(args: { tenantId: string; stepId: string }): Promise<StepState> {
    return { ...this.requireStep(args.tenantId, args.stepId) };
  }

  async transitionStep(args: { tenantId: string; stepId: string; to: StepStatus; expectedVersion: number }): Promise<StepState> {
    const step = this.requireStep(args.tenantId, args.stepId);
    const run = this.requireRun(args.tenantId, step.runId);
    assertStepTransition(step.status, args.to);
    assertValidAttempt(step.attempt);
    if (args.to === 'RETRYING' && !isStepRetryable(step, run.maxAttempts)) {
      throw new RetryBudgetExhaustedError(step.stepId, step.attempt, run.maxAttempts);
    }
    if (step.version !== args.expectedVersion) {
      throw new VersionConflictError('step', args.stepId, args.expectedVersion);
    }
    step.status = args.to;
    if (args.to === 'RETRYING') step.attempt += 1;
    step.version += 1;
    step.updatedAt = new Date().toISOString();
    return { ...step };
  }

  async retryStep(args: { tenantId: string; stepId: string; expectedVersion: number }): Promise<StepState> {
    return this.transitionStep({ ...args, to: 'RETRYING' });
  }

  async saveTurn(envelope: ExecutionTurnEnvelope): Promise<void> {
    const valid = revalidateEnvelope(envelope);
    const run = this.requireRun(valid.tenantId, valid.runId);
    void run;
    const step = this.requireStep(valid.tenantId, valid.stepId);
    if (step.runId !== valid.runId) {
      throw new TenantMismatchError('step/run', valid.stepId);
    }
    const existing = this.turns.filter((t) => t.runId === valid.runId).map((t) => t.turn);
    if (existing.includes(valid.turn)) throw new DuplicateTurnError(valid.runId, valid.turn);
    const max = existing.length === 0 ? 0 : Math.max(...existing);
    if (valid.turn <= max) throw new TurnRegressionError(valid.runId, valid.turn, max);
    this.turns.push(structuredClone(valid));
  }

  async listTurns(args: { tenantId: string; runId: string }): Promise<ExecutionTurnEnvelope[]> {
    this.requireRun(args.tenantId, args.runId);
    return structuredClone(
      this.turns
        .filter((t) => t.runId === args.runId && t.tenantId === args.tenantId)
        .sort((a, b) => a.turn - b.turn),
    );
  }

  async nextTurn(args: { tenantId: string; runId: string }): Promise<number> {
    this.requireRun(args.tenantId, args.runId);
    const turns = this.turns.filter((t) => t.runId === args.runId).map((t) => t.turn);
    return nextTurnNumber(turns);
  }

  private requireRun(tenantId: string, runId: string): StoredRun {
    const run = this.runs.get(runId);
    if (!run) throw new UnknownEntityError('run', runId);
    if (run.tenantId !== tenantId) throw new TenantMismatchError('run', runId);
    return run;
  }

  private requireStep(tenantId: string, stepId: string): StepState {
    const step = this.steps.get(stepId);
    if (!step) throw new UnknownEntityError('step', stepId);
    if (step.tenantId !== tenantId) throw new TenantMismatchError('step', stepId);
    return step;
  }
}

function requireId(id: string, tenantId: string): void {
  if (!id || !tenantId) throw new Error('runId/stepId and tenantId are required');
}

function stripRun(run: StoredRun): RunState {
  return { runId: run.runId, tenantId: run.tenantId, status: run.status, version: run.version, updatedAt: run.updatedAt };
}

// ─── Drizzle store (MySQL/TiDB, lazy imports, tenant-scoped CAS) ────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dbInstance: any = null;

async function getDb(): Promise<any> {
  if (dbInstance) return dbInstance;
  if (!process.env.DATABASE_URL && !process.env.TEST_DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }
  const { default: mysql } = await import('mysql2/promise');
  const { drizzle } = await import('drizzle-orm/mysql2');
  const pool = mysql.createPool({ uri: process.env.DATABASE_URL ?? process.env.TEST_DATABASE_URL });
  dbInstance = drizzle(pool, { mode: 'default' });
  return dbInstance;
}

async function tables() {
  const schema = await import('@/drizzle/schema');
  const { eq, and, asc, max } = await import('drizzle-orm');
  return { ...schema, eq, and, asc, max };
}

function toRunState(row: { id: string; tenantId: string; status: RunStatus; version: number; updatedAt: Date }): RunState {
  return { runId: row.id, tenantId: row.tenantId, status: row.status, version: row.version, updatedAt: row.updatedAt.toISOString() };
}

function toStepState(row: { id: string; runId: string; tenantId: string; status: StepStatus; attempt: number; version: number; updatedAt: Date }): StepState {
  assertValidAttempt(row.attempt);
  return { stepId: row.id, runId: row.runId, tenantId: row.tenantId, status: row.status, attempt: row.attempt, version: row.version, updatedAt: row.updatedAt.toISOString() };
}

export class DrizzleExecutionStore implements ExecutionStore {
  async createRun(args: { runId: string; tenantId: string; maxAttempts?: number }): Promise<RunState> {
    requireId(args.runId, args.tenantId);
    const db = await getDb();
    const { frankRuns } = await tables();
    const { randomUUID } = await import('crypto');
    void randomUUID;
    await db.insert(frankRuns).values({
      id: args.runId,
      tenantId: args.tenantId,
      status: 'CREATED',
      version: 1,
      maxAttempts: args.maxAttempts ?? 3,
    });
    return this.getRun({ tenantId: args.tenantId, runId: args.runId });
  }

  async getRun(args: { tenantId: string; runId: string }): Promise<RunState> {
    const db = await getDb();
    const { frankRuns, eq, and } = await tables();
    const rows = await db.select().from(frankRuns).where(and(eq(frankRuns.id, args.runId), eq(frankRuns.tenantId, args.tenantId)));
    if (rows.length === 0) {
      const anyRows = await db.select({ tenantId: frankRuns.tenantId }).from(frankRuns).where(eq(frankRuns.id, args.runId));
      if (anyRows.length > 0) throw new TenantMismatchError('run', args.runId);
      throw new UnknownEntityError('run', args.runId);
    }
    return toRunState(rows[0]);
  }

  async transitionRun(args: { tenantId: string; runId: string; to: RunStatus; expectedVersion: number }): Promise<RunState> {
    const current = await this.getRun({ tenantId: args.tenantId, runId: args.runId });
    assertRunTransition(current.status, args.to);
    const db = await getDb();
    const { frankRuns, eq, and } = await tables();
    const result = await db
      .update(frankRuns)
      .set({ status: args.to, version: current.version + 1 })
      .where(and(eq(frankRuns.id, args.runId), eq(frankRuns.tenantId, args.tenantId), eq(frankRuns.version, args.expectedVersion)));
    if ((result.affectedRows ?? result[0]?.affectedRows ?? 0) === 0) {
      throw new VersionConflictError('run', args.runId, args.expectedVersion);
    }
    return this.getRun({ tenantId: args.tenantId, runId: args.runId });
  }

  async createStep(args: { stepId: string; runId: string; tenantId: string }): Promise<StepState> {
    requireId(args.stepId, args.tenantId);
    await this.getRun({ tenantId: args.tenantId, runId: args.runId });
    const db = await getDb();
    const { frankSteps } = await tables();
    await db.insert(frankSteps).values({ id: args.stepId, runId: args.runId, tenantId: args.tenantId, status: 'PENDING', attempt: 1, version: 1 });
    return this.getStep({ tenantId: args.tenantId, stepId: args.stepId });
  }

  async getStep(args: { tenantId: string; stepId: string }): Promise<StepState> {
    const db = await getDb();
    const { frankSteps, eq, and } = await tables();
    const rows = await db.select().from(frankSteps).where(and(eq(frankSteps.id, args.stepId), eq(frankSteps.tenantId, args.tenantId)));
    if (rows.length === 0) {
      const anyRows = await db.select({ tenantId: frankSteps.tenantId }).from(frankSteps).where(eq(frankSteps.id, args.stepId));
      if (anyRows.length > 0) throw new TenantMismatchError('step', args.stepId);
      throw new UnknownEntityError('step', args.stepId);
    }
    return toStepState(rows[0]);
  }

  async transitionStep(args: { tenantId: string; stepId: string; to: StepStatus; expectedVersion: number }): Promise<StepState> {
    const step = await this.getStep({ tenantId: args.tenantId, stepId: args.stepId });
    const run = await this.getRun({ tenantId: args.tenantId, runId: step.runId });
    const runMax = await this.runMaxAttempts(args.tenantId, step.runId);
    void run;
    assertStepTransition(step.status, args.to);
    assertValidAttempt(step.attempt);
    if (args.to === 'RETRYING' && !isStepRetryable(step, runMax)) {
      throw new RetryBudgetExhaustedError(step.stepId, step.attempt, runMax);
    }
    const db = await getDb();
    const { frankSteps, eq, and } = await tables();
    const result = await db
      .update(frankSteps)
      .set({ status: args.to, attempt: args.to === 'RETRYING' ? step.attempt + 1 : step.attempt, version: step.version + 1 })
      .where(and(eq(frankSteps.id, args.stepId), eq(frankSteps.tenantId, args.tenantId), eq(frankSteps.version, args.expectedVersion)));
    if ((result.affectedRows ?? result[0]?.affectedRows ?? 0) === 0) {
      throw new VersionConflictError('step', args.stepId, args.expectedVersion);
    }
    return this.getStep({ tenantId: args.tenantId, stepId: args.stepId });
  }

  async retryStep(args: { tenantId: string; stepId: string; expectedVersion: number }): Promise<StepState> {
    return this.transitionStep({ ...args, to: 'RETRYING' });
  }

  async saveTurn(envelope: ExecutionTurnEnvelope): Promise<void> {
    const valid = revalidateEnvelope(envelope);
    const run = await this.getRun({ tenantId: valid.tenantId, runId: valid.runId });
    void run;
    const step = await this.getStep({ tenantId: valid.tenantId, stepId: valid.stepId });
    if (step.runId !== valid.runId) throw new TenantMismatchError('step/run', valid.stepId);
    const db = await getDb();
    const { frankTurns, eq, and, asc, max } = await tables();
    const { randomUUID } = await import('crypto');
    const existing = await db
      .select({ turn: frankTurns.turn })
      .from(frankTurns)
      .where(and(eq(frankTurns.runId, valid.runId), eq(frankTurns.tenantId, valid.tenantId)))
      .orderBy(asc(frankTurns.turn));
    void max;
    const turns = existing.map((r: { turn: number }) => r.turn);
    if (turns.includes(valid.turn)) throw new DuplicateTurnError(valid.runId, valid.turn);
    const maxTurn = turns.length === 0 ? 0 : Math.max(...turns);
    if (valid.turn <= maxTurn) throw new TurnRegressionError(valid.runId, valid.turn, maxTurn);
    try {
      await db.insert(frankTurns).values({
        id: randomUUID(),
        runId: valid.runId,
        stepId: valid.stepId,
        tenantId: valid.tenantId,
        turn: valid.turn,
        envelopeJson: JSON.stringify(valid),
      });
    } catch (error) {
      if (isDuplicateKey(error)) throw new DuplicateTurnError(valid.runId, valid.turn);
      throw error;
    }
  }

  async listTurns(args: { tenantId: string; runId: string }): Promise<ExecutionTurnEnvelope[]> {
    await this.getRun({ tenantId: args.tenantId, runId: args.runId });
    const db = await getDb();
    const { frankTurns, eq, and, asc } = await tables();
    const rows = await db
      .select()
      .from(frankTurns)
      .where(and(eq(frankTurns.runId, args.runId), eq(frankTurns.tenantId, args.tenantId)))
      .orderBy(asc(frankTurns.turn));
    return rows.map((r: { envelopeJson: string }) => JSON.parse(r.envelopeJson) as ExecutionTurnEnvelope);
  }

  async nextTurn(args: { tenantId: string; runId: string }): Promise<number> {
    await this.getRun({ tenantId: args.tenantId, runId: args.runId });
    const db = await getDb();
    const { frankTurns, eq, and, max } = await tables();
    const rows = await db
      .select({ maxTurn: max(frankTurns.turn) })
      .from(frankTurns)
      .where(and(eq(frankTurns.runId, args.runId), eq(frankTurns.tenantId, args.tenantId)));
    const current = (rows[0]?.maxTurn as number | null) ?? 0;
    return nextTurnNumber(current === 0 ? [] : [current]);
  }

  private async runMaxAttempts(tenantId: string, runId: string): Promise<number> {
    const db = await getDb();
    const { frankRuns, eq, and } = await tables();
    const rows = await db
      .select({ maxAttempts: frankRuns.maxAttempts })
      .from(frankRuns)
      .where(and(eq(frankRuns.id, runId), eq(frankRuns.tenantId, tenantId)));
    return (rows[0]?.maxAttempts as number) ?? 3;
  }
}

function isDuplicateKey(error: unknown): boolean {
  const code = (error as { code?: string })?.code ?? '';
  const message = error instanceof Error ? error.message : String(error);
  return code === 'ER_DUP_ENTRY' || message.includes('Duplicate entry');
}
