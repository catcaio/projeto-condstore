import { randomUUID } from 'crypto';
import { getAIProviderWithMeta } from './llm-gateway';
import { aiDecisionLogRepository } from '../../infra/repositories/ai-decision-log.repository';
import { getContext, appendMessage } from '../../infra/context-cache';
import { frankTokenUsageService } from '@/modules/frank/server';
import type { ContextMessage } from '../../infra/context-cache';

export interface FrankRunInput {
  tenantId: string;
  message: string;
  context?: Record<string, unknown>;
  messageId?: string;
  providerEventId?: string;
  /**
   * Normalised phone number (e.g. "whatsapp:+5511987654321").
   * When provided together with phoneHash, Frank fetches the last N messages
   * from the context cache / DB and includes them in the system prompt.
   */
  phoneNumber?: string;
  /**
   * SHA-256 hash of the raw phone number — used as the Redis cache key to
   * avoid storing PII.  Must be supplied alongside phoneNumber to enable context.
   */
  phoneHash?: string;
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

/** Build a system-prompt snippet from conversation history. */
function buildHistoryPrompt(history: ContextMessage[]): string | undefined {
  if (history.length === 0) return undefined;
  const lines = history.map(m => `[${m.direction}] ${m.body}`).join('\n');
  return `Histórico da conversa (últimas mensagens, da mais antiga para a mais recente):\n${lines}`;
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

    // ── Fetch conversation history (Redis → DB fallback) ──────────────────────
    // Only when both phoneHash and phoneNumber are present.
    // Failures are silently swallowed — context is a best-effort enrichment.
    let systemPrompt: string | undefined;
    if (input.phoneHash && input.phoneNumber) {
      const history = await getContext(
        input.tenantId,
        input.phoneHash,
        input.phoneNumber,
        5,
      );
      systemPrompt = buildHistoryPrompt(history);
    }

    const { provider, meta } = await getAIProviderWithMeta(input.tenantId);
    const startedAt = Date.now();
    try {
      const trackedResponse = await frankTokenUsageService.executeTrackedCall({
        tenantId: input.tenantId,
        model: meta.model,
        callSite: 'FrankOrchestrator.run',
        eventContext: {
          entityId: messageId,
          sessionId: input.phoneHash ?? null,
        },
        execute: async () => {
          const response = await provider.chat({
            tenantId: input.tenantId,
            system: systemPrompt,
            user: input.message,
            responseFormat: 'text',
            sessionId: input.phoneHash,
            correlationId: input.providerEventId ?? messageId,
            route: 'frank-orchestrator.run',
            metadata: {
              messageId,
              providerEventId: input.providerEventId ?? null,
              hasHistory: Boolean(systemPrompt),
            },
          });

          const rawUsage = response.raw && typeof response.raw === 'object'
            ? (response.raw as { usage?: unknown }).usage
            : undefined;

          return {
            result: response,
            usage: rawUsage,
          };
        },
      });
      const response = trackedResponse.result;
      const latencyMs = Date.now() - startedAt;
      const tokenCounts = {
        tokensIn: trackedResponse.usage.promptTokens || extractTokenCounts(response.raw).tokensIn,
        tokensOut: trackedResponse.usage.completionTokens || extractTokenCounts(response.raw).tokensOut,
      };

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

      // ── Update context cache with the processed inbound message ──────────────
      // Fire-and-forget: must not block or break the response path.
      if (input.phoneHash) {
        void appendMessage(input.tenantId, input.phoneHash, {
          body: input.message,
          direction: 'inbound',
          intent,
          intentConfidence: confidence ?? null,
          createdAt: new Date().toISOString(),
        });
      }

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
