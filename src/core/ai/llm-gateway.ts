import { tenantAiProviderRepository } from '../../infra/repositories/tenant-ai-provider.repository';
import { frankEventsRepository } from '../../infra/repositories/frank-events.repository';
import { logger } from '../../infra/logger';
import type { AIProvider, ChatInput, ChatOutput, EmbeddingsInput, EmbeddingsOutput } from './provider.interface';
import { OpenAICompatibleProvider } from './providers/openai-compatible.provider';
import { checkRedisRateLimit } from '../../infra/rate-limit/redis-rate-limiter';
import { sanitizeFrankPayload } from './frank-event-sanitize';
import { retrieveContextMulti } from './retrieval/retrieve-context';

const DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.DEFAULT_AI_TIMEOUT_MS || '20000', 10);

interface DefaultsConfig {
  baseUrl: string;
  model: string;
  embedModel: string;
  timeoutMs: number;
}

export interface AIProviderMeta {
  tenantId: string;
  providerType: string;
  model: string;
  embedModel: string;
}

function getDefaults(): DefaultsConfig {
  const baseUrl = process.env.DEFAULT_LMSTUDIO_BASE_URL;
  const model = process.env.DEFAULT_LMSTUDIO_MODEL;
  const embedModel = process.env.DEFAULT_EMBED_MODEL;

  if (!baseUrl || !model || !embedModel) {
    throw new Error('Missing DEFAULT_LMSTUDIO_BASE_URL, DEFAULT_LMSTUDIO_MODEL or DEFAULT_EMBED_MODEL');
  }

  return {
    baseUrl,
    model,
    embedModel,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
}

function isDevEnv(): boolean {
  return process.env.NODE_ENV !== 'production';
}

function extractTokenCounts(raw: unknown) {
  if (!raw || typeof raw !== 'object') return {};
  const usage = (raw as { usage?: Record<string, number> }).usage;
  if (!usage) return {};
  return {
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    total_tokens: usage.total_tokens,
  };
}

function extractToolCalls(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return undefined;
  const choices = (raw as { choices?: Array<{ message?: { tool_calls?: unknown } }> }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return undefined;
  return choices[0]?.message?.tool_calls;
}

function isRagEnabledDefault(): boolean {
  return String(process.env.RAG_ENABLED_DEFAULT || 'false').toLowerCase() === 'true';
}

function getRagMaxChunks(): number {
  const value = Number.parseInt(process.env.RAG_MAX_CHUNKS || '5', 10);
  if (!Number.isFinite(value) || value <= 0) return 5;
  return Math.min(value, 10);
}

function getRagDocsMaxChunks(): number {
  const value = Number.parseInt(process.env.RAG_DOCS_MAX_CHUNKS || '3', 10);
  if (!Number.isFinite(value) || value < 0) return 3;
  return Math.min(value, 10);
}

function getRagChatMaxChunks(): number {
  const value = Number.parseInt(process.env.RAG_CHAT_MAX_CHUNKS || '2', 10);
  if (!Number.isFinite(value) || value < 0) return 2;
  return Math.min(value, 10);
}

function getRagMaxContextChars(): number {
  const value = Number.parseInt(process.env.RAG_MAX_CONTEXT_CHARS || '1500', 10);
  if (!Number.isFinite(value) || value <= 0) return 1500;
  return Math.min(value, 1500);
}

function getRagMinScore(): number {
  const value = Number.parseFloat(process.env.RAG_MIN_SCORE || '0.75');
  if (!Number.isFinite(value)) return 0.75;
  return Math.max(0, Math.min(value, 1));
}

function getRagDocsMinScore(): number {
  const value = Number.parseFloat(process.env.RAG_DOCS_MIN_SCORE || process.env.RAG_MIN_SCORE || '0.75');
  if (!Number.isFinite(value)) return 0.75;
  return Math.max(0, Math.min(value, 1));
}

function getRagChatMinScore(): number {
  const value = Number.parseFloat(process.env.RAG_CHAT_MIN_SCORE || process.env.RAG_MIN_SCORE || '0.75');
  if (!Number.isFinite(value)) return 0.75;
  return Math.max(0, Math.min(value, 1));
}

function buildContextText(chunks: Array<{ score: number; text: string; meta: { created_at: string } }>): string {
  return chunks
    .map((chunk, index) => {
      const datePart = typeof chunk.meta?.created_at === 'string'
        ? chunk.meta.created_at.slice(0, 10)
        : 'n/a';
      const score = Number.isFinite(chunk.score) ? chunk.score.toFixed(2) : '0.00';
      return `[${index + 1}] (score=${score}, ${datePart})\n${chunk.text}`;
    })
    .join('\n\n')
    .trim();
}

function mergeSystemPromptWithRag(baseSystem: string | undefined, ragText: string): string {
  const base = (baseSystem || '').trim();
  if (!ragText.trim()) return baseSystem || '';

  return [
    base,
    '### Contexto relevante:',
    ragText,
  ]
    .filter((part) => part && part.trim())
    .join('\n\n');
}

class DualModelProvider implements AIProvider {
  constructor(
    private readonly chatProvider: OpenAICompatibleProvider,
    private readonly embeddingsProvider: OpenAICompatibleProvider
  ) {}

  chat(input: ChatInput): Promise<ChatOutput> {
    return this.chatProvider.chat(input);
  }

  embeddings(input: EmbeddingsInput): Promise<EmbeddingsOutput> {
    return this.embeddingsProvider.embeddings(input);
  }
}

class ObservedProvider implements AIProvider {
  constructor(
    private readonly provider: AIProvider,
    private readonly meta: AIProviderMeta
  ) {}

  async chat(input: ChatInput): Promise<ChatOutput> {
    const rate = await checkRedisRateLimit({
      tenantId: this.meta.tenantId,
      scope: 'ai.chat',
    });
    if (!rate.allowed) {
      logger.warn('ai_rate_limit', {
        tenant_id: this.meta.tenantId,
        provider_type: this.meta.providerType,
        model: this.meta.model,
        reset_at: rate.resetAt,
      });
      throw new Error('AI_RATE_LIMIT');
    }

    const totalStartedAt = Date.now();
    let finalInput: ChatInput = input;
    let ragLog = {
      enabled: false,
      chunks: 0,
      latencyMs: 0,
      contextChars: 0,
      filteredOut: false,
      cacheHit: false,
      docsChunks: 0,
      chatChunks: 0,
    };
    let providerStartedAt = 0;

    try {
      if (isRagEnabledDefault()) {
        const ragStartedAt = Date.now();
        try {
          const ragResult = await retrieveContextMulti({
            tenantId: this.meta.tenantId,
            query: input.user,
            docsLimit: getRagDocsMaxChunks(),
            chatLimit: getRagChatMaxChunks(),
          });
          const docsMinScore = getRagDocsMinScore();
          const chatMinScore = getRagChatMinScore();
          const docsChunks = ragResult.docs.filter((chunk) => chunk.score >= docsMinScore);
          const chatChunks = ragResult.chat.filter((chunk) => chunk.score >= chatMinScore);
          const scoredChunks = [...docsChunks, ...chatChunks];
          const filteredOut = ragResult.chunks.length > 0 && scoredChunks.length === 0;
          const ragText = buildContextText(scoredChunks);
          const trimmed = ragText.slice(0, getRagMaxContextChars());
          const ragLatencyMs = Date.now() - ragStartedAt;
          const shouldInject = Boolean(trimmed);

          ragLog = {
            enabled: shouldInject,
            chunks: scoredChunks.length,
            latencyMs: ragResult.cacheHit ? 0 : ragLatencyMs,
            contextChars: shouldInject ? trimmed.length : 0,
            filteredOut,
            cacheHit: ragResult.cacheHit === true,
            docsChunks: docsChunks.length,
            chatChunks: chatChunks.length,
          };

          finalInput = {
            ...input,
            system: shouldInject && trimmed
              ? mergeSystemPromptWithRag(input.system, trimmed)
              : input.system,
            metadata: {
              ...(input.metadata ?? {}),
              ragUsed: shouldInject,
              ragChunks: scoredChunks.length,
              ragDocsChunks: docsChunks.length,
              ragChatChunks: chatChunks.length,
              ragLatencyMs: ragResult.cacheHit ? 0 : ragLatencyMs,
              ragCacheHit: ragResult.cacheHit === true,
              ragFilteredOut: filteredOut,
            },
          };
        } catch (error) {
          ragLog = {
            enabled: false,
            chunks: 0,
            latencyMs: Date.now() - ragStartedAt,
            contextChars: 0,
            filteredOut: false,
            cacheHit: false,
            docsChunks: 0,
            chatChunks: 0,
          };
          finalInput = {
            ...input,
            metadata: {
              ...(input.metadata ?? {}),
              ragUsed: false,
              ragChunks: 0,
            },
          };
          logger.warn('rag_failed', {
            tenant_id: this.meta.tenantId,
            provider_type: this.meta.providerType,
            model: this.meta.model,
            latency_ms: ragLog.latencyMs,
            error: (error as Error).message,
          });
        }
      }

      providerStartedAt = Date.now();
      const result = await this.provider.chat(finalInput);
      const modelLatencyMs = Date.now() - providerStartedAt;
      const totalLatencyMs = Date.now() - totalStartedAt;
      const tokenCounts = extractTokenCounts(result.raw);
      logger.info('ai_chat', {
        tenant_id: this.meta.tenantId,
        provider_type: this.meta.providerType,
        model: this.meta.model,
        latency_ms: modelLatencyMs,
        status: 'ok',
        'rag.enabled': ragLog.enabled,
        'rag.chunks': ragLog.chunks,
        'rag.latency_ms': ragLog.latencyMs,
        'rag.filtered_out': ragLog.filteredOut,
        'rag.cache_hit': ragLog.cacheHit,
        'rag.docs_chunks': ragLog.docsChunks,
        'rag.chat_chunks': ragLog.chatChunks,
        ...tokenCounts,
      });
      logger.info('ai_chat_metrics', {
        tenantId: this.meta.tenantId,
        ragUsed: ragLog.enabled,
        ragChunks: ragLog.chunks,
        ragLatencyMs: ragLog.latencyMs,
        ragFilteredOut: ragLog.filteredOut,
        ragCacheHit: ragLog.cacheHit,
        ragDocsChunks: ragLog.docsChunks,
        ragChatChunks: ragLog.chatChunks,
        modelLatencyMs,
        totalLatencyMs,
        tokensPrompt: typeof tokenCounts.prompt_tokens === 'number' ? tokenCounts.prompt_tokens : null,
        tokensCompletion: typeof tokenCounts.completion_tokens === 'number' ? tokenCounts.completion_tokens : null,
      });

      const rawFrankPayload = {
        prompt: {
          system: finalInput.system ?? null,
          user: finalInput.user,
        },
        response: result.text,
        messagesCount: finalInput.messagesCount ?? (finalInput.system ? 2 : 1),
        toolCalls: finalInput.toolCalls ?? extractToolCalls(result.raw),
        route: finalInput.route,
        metadata: {
          ...(finalInput.metadata ?? {}),
          totalLatencyMs,
          modelLatencyMs,
          ragContextChars: ragLog.contextChars,
          responseFormat: finalInput.responseFormat,
          temperature: finalInput.temperature,
          maxTokens: finalInput.maxTokens,
        },
      };

      await frankEventsRepository.insertEvent({
        tenantId: this.meta.tenantId,
        sessionId: finalInput.sessionId,
        correlationId: finalInput.correlationId,
        kind: 'ai.chat',
        payloadJson: sanitizeFrankPayload(rawFrankPayload),
        provider: this.meta.providerType,
        model: this.meta.model,
        latencyMs: modelLatencyMs,
        tokensPrompt: typeof tokenCounts.prompt_tokens === 'number' ? tokenCounts.prompt_tokens : undefined,
        tokensCompletion: typeof tokenCounts.completion_tokens === 'number' ? tokenCounts.completion_tokens : undefined,
      });
      return result;
    } catch (error) {
      const latencyMs = providerStartedAt > 0 ? (Date.now() - providerStartedAt) : 0;
      logger.error('ai_chat_failed', error as Error, {
        tenant_id: this.meta.tenantId,
        provider_type: this.meta.providerType,
        model: this.meta.model,
        latency_ms: latencyMs,
        'rag.enabled': ragLog.enabled,
        'rag.chunks': ragLog.chunks,
        'rag.latency_ms': ragLog.latencyMs,
        'rag.filtered_out': ragLog.filteredOut,
        'rag.cache_hit': ragLog.cacheHit,
        'rag.docs_chunks': ragLog.docsChunks,
        'rag.chat_chunks': ragLog.chatChunks,
        status: 'error',
        error_code: (error as Error).name || 'UNKNOWN',
      });
      throw error;
    }
  }

  async embeddings(input: EmbeddingsInput): Promise<EmbeddingsOutput> {
    const rate = await checkRedisRateLimit({
      tenantId: this.meta.tenantId,
      scope: 'ai.embed',
    });
    if (!rate.allowed) {
      logger.warn('ai_rate_limit', {
        tenant_id: this.meta.tenantId,
        provider_type: this.meta.providerType,
        model: this.meta.embedModel,
        reset_at: rate.resetAt,
      });
      throw new Error('AI_RATE_LIMIT');
    }

    const startedAt = Date.now();
    try {
      const result = await this.provider.embeddings(input);
      const latencyMs = Date.now() - startedAt;
      logger.info('ai_embeddings', {
        tenant_id: this.meta.tenantId,
        provider_type: this.meta.providerType,
        model: this.meta.embedModel,
        latency_ms: latencyMs,
        status: 'ok',
        ...extractTokenCounts((result as unknown as { raw?: unknown }).raw),
      });
      return result;
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      logger.error('ai_embeddings_failed', error as Error, {
        tenant_id: this.meta.tenantId,
        provider_type: this.meta.providerType,
        model: this.meta.embedModel,
        latency_ms: latencyMs,
        status: 'error',
        error_code: (error as Error).name || 'UNKNOWN',
      });
      throw error;
    }
  }
}

export async function getAIProvider(tenantId: string): Promise<AIProvider> {
  const { provider } = await getAIProviderWithMeta(tenantId);
  return provider;
}

export async function getAIProviderWithMeta(tenantId: string): Promise<{ provider: AIProvider; meta: AIProviderMeta }> {
  if (!tenantId) {
    throw new Error('tenantId is required to resolve AI provider');
  }

  const tenantConfig = await tenantAiProviderRepository.getProviderConfig(tenantId);
  const defaults = isDevEnv() ? getDefaults() : null;

  if ((!tenantConfig || tenantConfig.isEnabled === 0) && !defaults) {
    throw new Error('AI provider not configured for tenant');
  }

  const baseUrl = tenantConfig?.baseUrl || defaults!.baseUrl;
  const model = tenantConfig?.model || defaults!.model;
  const embedModel = tenantConfig?.embedModel || defaults!.embedModel;
  const timeoutMs = tenantConfig?.timeoutMs || defaults!.timeoutMs;
  // resolvedApiKey já é decriptada em memória pelo repositório (nunca ciphertext aqui)
  const apiKey = tenantConfig?.resolvedApiKey || undefined;
  const providerType = tenantConfig?.providerType || 'shared';
  const chatProvider = new OpenAICompatibleProvider({
    baseUrl,
    model,
    apiKey,
    timeoutMs,
  });

  const embeddingsProvider = new OpenAICompatibleProvider({
    baseUrl,
    model: embedModel || model,
    apiKey,
    timeoutMs,
  });

  const meta: AIProviderMeta = {
    tenantId,
    providerType,
    model,
    embedModel: embedModel || model,
  };

  return {
    provider: new ObservedProvider(new DualModelProvider(chatProvider, embeddingsProvider), meta),
    meta,
  };
}
