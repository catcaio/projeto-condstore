import { randomUUID } from 'crypto';
import { and, eq, gte } from 'drizzle-orm';
import { frankEvents } from '../../drizzle/schema';
import { getDb } from '../db';
import { logger } from '../logger';

type FrankEventKind = 'ai.chat';

type FrankEventPayload = unknown;

export interface InsertFrankEventInput {
  tenantId: string;
  sessionId?: string;
  correlationId?: string;
  kind: FrankEventKind;
  payloadJson: FrankEventPayload;
  provider: string;
  model: string;
  latencyMs: number;
  tokensPrompt: number;
  tokensCompletion: number;
  ragUsed: boolean;
  ragChunks: number;
  ragLatencyMs: number;
}

const DEDUP_WINDOW_MS = 5 * 60 * 1000;

function pruneUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => pruneUndefined(item)) as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = pruneUndefined(v);
      }
    }
    return out as T;
  }
  return value;
}

export class FrankEventsRepository {
  async insertEvent(input: InsertFrankEventInput): Promise<void> {
    if (!input?.tenantId || !input?.kind || !input?.provider || !input?.model) {
      logger.warn('frank_events invalid input, skipping', {
        tenantId: input?.tenantId,
        kind: input?.kind,
        provider: input?.provider,
        model: input?.model,
      });
      return;
    }

    try {
      const db = await getDb();

      if (input.correlationId) {
        const threshold = new Date(Date.now() - DEDUP_WINDOW_MS);
        const [existing] = await db
          .select({ id: frankEvents.id })
          .from(frankEvents)
          .where(and(
            eq(frankEvents.tenantId, input.tenantId),
            eq(frankEvents.correlationId, input.correlationId),
            eq(frankEvents.kind, input.kind),
            gte(frankEvents.createdAt, threshold),
          ))
          ;

        if (existing) {
          logger.debug('frank_events duplicate skipped', {
            tenantId: input.tenantId,
            correlationId: input.correlationId,
            kind: input.kind,
          });
          return;
        }
      }

      const latencyMs = Number.isFinite(input.latencyMs) ? Math.max(0, Math.trunc(input.latencyMs)) : 0;
      const tokensPrompt = Number.isFinite(input.tokensPrompt) ? Math.max(0, Math.trunc(input.tokensPrompt)) : 0;
      const tokensCompletion = Number.isFinite(input.tokensCompletion) ? Math.max(0, Math.trunc(input.tokensCompletion)) : 0;
      const ragChunks = Number.isFinite(input.ragChunks) ? Math.max(0, Math.trunc(input.ragChunks)) : 0;
      const ragLatencyMs = Number.isFinite(input.ragLatencyMs) ? Math.max(0, Math.trunc(input.ragLatencyMs)) : 0;

      await db.insert(frankEvents).values({
        id: randomUUID(),
        tenantId: input.tenantId,
        sessionId: input.sessionId ?? null,
        correlationId: input.correlationId ?? null,
        kind: input.kind,
        payloadJson: pruneUndefined(input.payloadJson) as unknown as Record<string, unknown>,
        provider: input.provider,
        model: input.model,
        latencyMs,
        tokensPrompt,
        tokensCompletion,
        ragUsed: input.ragUsed ? 1 : 0,
        ragChunks,
        ragLatencyMs,
      });
    } catch (error) {
      logger.warn('Failed to persist frank event', {
        tenantId: input.tenantId,
        kind: input.kind,
        correlationId: input.correlationId,
        error: (error as Error).message,
      });
    }
  }
}

export const frankEventsRepository = new FrankEventsRepository();
