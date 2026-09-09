/**
 * FRK-9 — Execution persistence.
 *
 * No new migration: the auditable trail of Execution Turn Envelopes is
 * persisted on the existing `frank_events` table with
 * kind = 'frank.execution.turn'. A dedicated
 * frank_execution_runs/steps table is a deferred follow-up (requires
 * migration + DB access, out of scope for this branch).
 */
import type { ExecutionTurnEnvelope } from './execution-state-machine';

export const EXECUTION_TURN_EVENT_KIND = 'frank.execution.turn';

export interface ExecutionStore {
  saveTurn(envelope: ExecutionTurnEnvelope): Promise<void>;
  listTurns(runId: string): Promise<ExecutionTurnEnvelope[]>;
}

export class InMemoryExecutionStore implements ExecutionStore {
  private turnsByRun = new Map<string, ExecutionTurnEnvelope[]>();

  async saveTurn(envelope: ExecutionTurnEnvelope): Promise<void> {
    const turns = this.turnsByRun.get(envelope.runId) ?? [];
    turns.push(structuredClone(envelope));
    this.turnsByRun.set(envelope.runId, turns);
  }

  async listTurns(runId: string): Promise<ExecutionTurnEnvelope[]> {
    return structuredClone(this.turnsByRun.get(runId) ?? []);
  }
}

/**
 * Drizzle-backed store. Lazy imports keep this module side-effect free so
 * unit tests never touch DB/network. Requires DB access — not exercised in
 * this branch's verification (see FRK-9 report).
 */
export class DrizzleFrankEventsExecutionStore implements ExecutionStore {
  async saveTurn(envelope: ExecutionTurnEnvelope): Promise<void> {
    const { getDb } = await import('@/infra/db');
    const { frankEvents } = await import('@/drizzle/schema');
    const { randomUUID } = await import('crypto');
    const db = await getDb();
    await db.insert(frankEvents).values({
      id: randomUUID(),
      tenantId: envelope.tenantId,
      sessionId: envelope.runId,
      correlationId: envelope.requestId,
      kind: EXECUTION_TURN_EVENT_KIND,
      payloadJson: JSON.parse(JSON.stringify(envelope)) as Record<string, unknown>,
      provider: 'frank-runtime',
      model: 'execution-state-machine',
      latencyMs: 0,
      tokensPrompt: 0,
      tokensCompletion: 0,
      ragUsed: 0,
      ragChunks: 0,
      ragLatencyMs: 0,
    });
  }

  async listTurns(runId: string): Promise<ExecutionTurnEnvelope[]> {
    const { getDb } = await import('@/infra/db');
    const { frankEvents } = await import('@/drizzle/schema');
    const { eq, and } = await import('drizzle-orm');
    const db = await getDb();
    const rows = await db
      .select()
      .from(frankEvents)
      .where(
        and(
          eq(frankEvents.sessionId, runId),
          eq(frankEvents.kind, EXECUTION_TURN_EVENT_KIND),
        ),
      );
    return rows.map((r) => r.payloadJson as unknown as ExecutionTurnEnvelope);
  }
}
