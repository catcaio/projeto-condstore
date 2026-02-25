import { randomUUID } from 'crypto';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '../db';
import { aiDecisionLogs, type NewAiDecisionLogRecord } from '../../drizzle/schema';
import { logger } from '../logger';

export interface SaveDecisionLogInput {
  tenantId: string;
  messageId: string;
  providerEventId?: string | null;
  provider: string;
  model: string;
  intent: string;
  confidence?: number | null;
  toolUsed?: string | null;
  toolPayload?: string | null;
  tokensIn?: number | null;
  tokensOut?: number | null;
  latencyMs?: number | null;
  responseType: string;
}

export interface AiDecisionLogListItem {
  id: string;
  tenantId: string;
  messageId: string;
  providerEventId: string | null;
  provider: string;
  model: string;
  intent: string;
  confidence: number | null;
  toolUsed: string | null;
  toolPayload: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  latencyMs: number | null;
  responseType: string;
  createdAt: string;
}

export class AiDecisionLogRepository {
  async saveDecisionLog(input: SaveDecisionLogInput): Promise<void> {
    if (!input?.tenantId || !input.messageId || !input.provider || !input.model || !input.intent) {
      logger.error('Invalid AI decision log input', new Error('Missing required fields'), {
        tenantId: input?.tenantId,
        messageId: input?.messageId,
        provider: input?.provider,
        model: input?.model,
        intent: input?.intent,
      });
      return;
    }

    try {
      const db = await getDb();
      const record: NewAiDecisionLogRecord = {
        id: randomUUID(),
        tenantId: input.tenantId,
        messageId: input.messageId,
        providerEventId: input.providerEventId ?? null,
        provider: input.provider,
        model: input.model,
        intent: input.intent,
        confidence: (typeof input.confidence === 'number' ? input.confidence.toFixed(4) : null),
        toolUsed: input.toolUsed ?? null,
        toolPayload: input.toolPayload ?? null,
        tokensIn: input.tokensIn ?? null,
        tokensOut: input.tokensOut ?? null,
        latencyMs: input.latencyMs ?? null,
        responseType: input.responseType,
      };

      await db.insert(aiDecisionLogs).values(record);
    } catch (error) {
      logger.error('Failed to persist AI decision log', error as Error, {
        tenantId: input.tenantId,
        messageId: input.messageId,
      });
    }
  }

  async listRecentByTenant(tenantId: string, limit = 20): Promise<AiDecisionLogListItem[]> {
    if (!tenantId || limit <= 0) return [];

    try {
      const db = await getDb();
      const rows = await db
        .select()
        .from(aiDecisionLogs)
        .where(eq(aiDecisionLogs.tenantId, tenantId))
        .orderBy(desc(aiDecisionLogs.createdAt))
        .limit(limit);

      return rows.map((row) => ({
        id: row.id,
        tenantId: row.tenantId,
        messageId: row.messageId,
        providerEventId: row.providerEventId ?? null,
        provider: row.provider,
        model: row.model,
        intent: row.intent,
        confidence: row.confidence === null || row.confidence === undefined ? null : Number(row.confidence),
        toolUsed: row.toolUsed ?? null,
        toolPayload: row.toolPayload ?? null,
        tokensIn: row.tokensIn ?? null,
        tokensOut: row.tokensOut ?? null,
        latencyMs: row.latencyMs ?? null,
        responseType: row.responseType,
        createdAt: row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : new Date(String(row.createdAt)).toISOString(),
      }));
    } catch (error) {
      logger.error('Failed to query AI decision log', error as Error, { tenantId });
      return [];
    }
  }
}

export const aiDecisionLogRepository = new AiDecisionLogRepository();
