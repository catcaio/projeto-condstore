import { randomUUID } from 'crypto';
import { getDb } from '../db';
import { aiDecisionLogs } from '../../drizzle/schema';
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
      await db.insert(aiDecisionLogs).values({
        id: randomUUID(),
        tenantId: input.tenantId,
        messageId: input.messageId,
        providerEventId: input.providerEventId ?? null,
        provider: input.provider,
        model: input.model,
        intent: input.intent,
        confidence: input.confidence ?? null,
        toolUsed: input.toolUsed ?? null,
        toolPayload: input.toolPayload ?? null,
        tokensIn: input.tokensIn ?? null,
        tokensOut: input.tokensOut ?? null,
        latencyMs: input.latencyMs ?? null,
        responseType: input.responseType,
      });
    } catch (error) {
      logger.error('Failed to persist AI decision log', error as Error, {
        tenantId: input.tenantId,
        messageId: input.messageId,
      });
    }
  }
}

export const aiDecisionLogRepository = new AiDecisionLogRepository();
