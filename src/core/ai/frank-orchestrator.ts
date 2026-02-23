import { randomUUID } from 'crypto';
import { getAIProviderWithMeta } from './llm-gateway';
import { aiDecisionLogRepository } from '../../infra/repositories/ai-decision-log.repository';

export interface FrankRunInput {
  tenantId: string;
  message: string;
  context?: Record<string, unknown>;
  messageId?: string;
  providerEventId?: string;
}

export interface FrankRunResult {
  replyText: string;
  intent?: string;
  confidence?: number;
}

function extractTokenCounts(raw: unknown): { tokensIn?: number; tokensOut?: number } {
  if (!raw || typeof raw !== 'object') return {};
  const usage = (raw as { usage?: Record<string, number> }).usage;
  if (!usage) return {};
  return {
    tokensIn: usage.prompt_tokens,
    tokensOut: usage.completion_tokens,
  };
}

export class FrankOrchestrator {
  async run(input: FrankRunInput): Promise<FrankRunResult> {
    if (!input.tenantId) {
      throw new Error('tenantId is required to run Frank');
    }

    if (!input.message) {
      throw new Error('message is required to run Frank');
    }

    const messageId = input.messageId ?? input.providerEventId ?? randomUUID();
    const intent = (input.context?.intent as string | undefined) ?? 'unknown';
    const confidence = (input.context?.confidence as number | undefined) ?? null;

    const { provider, meta } = await getAIProviderWithMeta(input.tenantId);
    const startedAt = Date.now();
    try {
      const response = await provider.chat({
        tenantId: input.tenantId,
        user: input.message,
        responseFormat: 'text',
      });
      const latencyMs = Date.now() - startedAt;
      const tokenCounts = extractTokenCounts(response.raw);

      void aiDecisionLogRepository.saveDecisionLog({
        tenantId: input.tenantId,
        messageId,
        providerEventId: input.providerEventId ?? null,
        provider: meta.providerType,
        model: meta.model,
        intent,
        confidence,
        tokensIn: tokenCounts.tokensIn ?? null,
        tokensOut: tokenCounts.tokensOut ?? null,
        latencyMs,
        responseType: 'ok',
      });

      return {
        replyText: response.text,
        intent,
        confidence: confidence ?? undefined,
      };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      void aiDecisionLogRepository.saveDecisionLog({
        tenantId: input.tenantId,
        messageId,
        providerEventId: input.providerEventId ?? null,
        provider: meta.providerType,
        model: meta.model,
        intent,
        confidence,
        latencyMs,
        responseType: 'error',
      });
      throw error;
    }
  }
}

export const frankOrchestrator = new FrankOrchestrator();
