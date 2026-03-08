import { randomUUID } from 'crypto';
import { tenantAiProviderRepository } from '../../infra/repositories/tenant-ai-provider.repository';
import { frankEventsRepository } from '../../infra/repositories/frank-events.repository';
import { logger } from '../../infra/logger';
import type { AIProvider, ChatInput, ChatOutput, EmbeddingsInput, EmbeddingsOutput } from './provider.interface';
import { OpenAICompatibleProvider } from './providers/openai-compatible.provider';
import { checkRedisRateLimit } from '../../infra/rate-limit/redis-rate-limiter';
import { sanitizeFrankPayload } from './frank-event-sanitize';
import { retrieveContextMulti } from './retrieval/retrieve-context';
import { resolveFrankModelVersion } from './model-registry';
import { getTenantState } from './tenant-state-resolver';
import { tokenUsageEventsRepository } from '../../infra/repositories/token-usage-events.repository';
import { promptRegistry } from './prompt-registry';
import { piiRedactor } from './pii-redactor';
import { injectionGuard, enforceInjectionPolicy } from './injection-guard';
import { circuitBreaker } from '../../infra/security/circuit-breaker';
import { structuredLogger } from '../../infra/log/logger';

/** Thrown when a tenant's monthly token budget is fully exhausted. */
export class BudgetLockedError extends Error {
  constructor(tenantId: string) {
    super(`BUDGET_LOCKED: LLM calls blocked for tenant ${tenantId}`);
    this.name = 'BudgetLockedError';
  }
}

/** Model to use when tenant is in 'degraded' zone (80-100% budget). */
function getDegradedModel(): string {
  return process.env.DEGRADED_MODEL ?? 'gpt-4o-mini';
}


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

function parseRagEnabledTenants(): Set<string> {
  return new Set(
    String(process.env.RAG_ENABLED_TENANTS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function resolveRagEnabledForTenant(tenantId: string): { enabled: boolean; source?: 'default' | 'tenants' } {
  if (parseRagEnabledTenants().has(tenantId)) {
    return { enabled: true, source: 'tenants' };
  }
  if (isRagEnabledDefault()) {
    return { enabled: true, source: 'default' };
  }
  return { enabled: false };
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

function getRagMinAvgScore(): number {
  const value = Number.parseFloat(process.env.RAG_MIN_AVG_SCORE || '0.78');
  if (!Number.isFinite(value)) return 0.78;
  return Math.max(0, Math.min(value, 1));
}

function truncateRagChunkText(text: string, maxLen = 500): string {
  const clean = String(text || '').trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen)}...[truncated]`;
}

function buildContextTextV2(
  docsChunks: Array<{ score: number; text: string; meta: { path?: string } }>,
  chatChunks: Array<{ score: number; text: string; meta: { created_at: string } }>,
): string {
  const parts: string[] = [];

  if (docsChunks.length > 0) {
    parts.push('### Contexto (Docs)');
    docsChunks.forEach((chunk, index) => {
      const score = Number.isFinite(chunk.score) ? chunk.score.toFixed(2) : '0.00';
      const path = typeof chunk.meta?.path === 'string' ? chunk.meta.path : 'n/a';
      parts.push(`[D${index + 1}] (score=${score}, path=${path})`);
      parts.push(truncateRagChunkText(chunk.text, 500));
      parts.push('');
    });
  }

  if (chatChunks.length > 0) {
    parts.push('### Contexto (Memória)');
    chatChunks.forEach((chunk, index) => {
      const score = Number.isFinite(chunk.score) ? chunk.score.toFixed(2) : '0.00';
      const datePart = typeof chunk.meta?.created_at === 'string'
        ? chunk.meta.created_at.slice(0, 10)
        : 'n/a';
      parts.push(`[M${index + 1}] (score=${score}, date=${datePart})`);
      parts.push(truncateRagChunkText(chunk.text, 500));
      parts.push('');
    });
  }

  return parts.join('\n').trim();
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
  ) { }

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
  ) { }

  async chat(input: ChatInput): Promise<ChatOutput> {
    // ── Governance Layer (PII, Injection, Registry) ─────────────────────────
    let finalSystem = input.system;
    let finalTemperature = input.temperature;
    let finalMaxTokens = input.maxTokens;
    let promptVersion = 'none';

    // 1. Resolve Active Prompt if defined by route
    const registryId = input.route ? `cockpit:${input.route}` : 'cockpit:default';
    const activePrompt = await promptRegistry.getActivePrompt(registryId);

    if (activePrompt) {
      finalSystem = activePrompt.system;
      finalTemperature = activePrompt.temperature;
      finalMaxTokens = activePrompt.maxTokens;
      promptVersion = activePrompt.version;
    }

    // 2. Detect and enforce prompt injection policy
    const injectionResult = injectionGuard.analyze(input.user || '');
    const injectionPolicy = enforceInjectionPolicy(
      input.user || '',
      injectionResult,
      { tenantId: this.meta.tenantId, route: input.route },
    );

    // Hard block on high-risk injection
    if (injectionPolicy.action === 'block') {
      return {
        text: injectionPolicy.blockedResponse!,
        raw: { blocked: true, reason: 'injection_guard' },
      } as unknown as ChatOutput;
    }

    // 3. PII Redaction (use degraded input if injection was low-risk)
    const userInputForPii = injectionPolicy.action === 'degrade'
      ? injectionPolicy.sanitizedInput
      : (input.user || '');
    const sanitizedUser = piiRedactor.sanitizeInput(userInputForPii);

    // ── Budget / state gate (ADR 006 / 007) ─────────────────────────────────
    const tenantState = await getTenantState(this.meta.tenantId);
    const effectiveModel =
      (tenantState.state === 'degraded' || tenantState.state === 'degraded_preemptive') ? getDegradedModel() : this.meta.model;

    logger.info('ai_budget_state', {
      tenantId: this.meta.tenantId,
      budgetState: tenantState.state,
      stateSource: tenantState.source,
      stateRevision: tenantState.revision,
      configuredModel: this.meta.model,
      effectiveModel,
      injectionDetected: injectionResult.detected,
      injectionRisk: injectionResult.risk,
      injectionAction: injectionPolicy.action,
      promptVersion
    });

    if (tenantState.state === 'locked') {
      logger.warn('ai_budget_locked', {
        tenantId: this.meta.tenantId,
        stateSource: tenantState.source,
        stateRevision: tenantState.revision,
      });
      // enforcement absoluto retorna format padronizado sem quebrar downstream
      return {
        error: 'BUDGET_LOCKED',
        message: 'Orçamento mensal atingido.',
        upgradeRequired: true
      } as unknown as ChatOutput;
    }

    if (circuitBreaker.isOpen(this.meta.tenantId, 'ai')) {
      structuredLogger.warn('ai_circuit_open', {
        tenantId: this.meta.tenantId,
        eventType: 'ai_circuit_open'
      });
      return {
        error: 'CIRCUIT_OPEN',
        message: 'Estamos passando por instabilidade, retornaremos em instantes.',
        text: 'Estamos passando por instabilidade, retornaremos em instantes.'
      } as unknown as ChatOutput;
    }

    // ── Redis rate-limit (existing) ──────────────────────────────────────────
    const rate = await checkRedisRateLimit({
      tenantId: this.meta.tenantId,
      scope: 'ai.chat',
    });
    if (!rate.allowed) {
      logger.warn('ai_rate_limit', {
        tenant_id: this.meta.tenantId,
        provider_type: this.meta.providerType,
        model: effectiveModel,
        reset_at: rate.resetAt,
      });
      throw new Error('AI_RATE_LIMIT');
    }

    const totalStartedAt = Date.now();
    let finalInput: ChatInput = {
      ...input,
      system: finalSystem,
      user: sanitizedUser,
      temperature: finalTemperature,
      maxTokens: finalMaxTokens
    };
    let ragLog = {
      enabled: false,
      chunks: 0,
      latencyMs: 0,
      contextChars: 0,
      filteredOut: false,
      cacheHit: false,
      docsChunks: 0,
      chatChunks: 0,
      avgScore: 0,
      qualityGateFailed: false,
      enabledSource: undefined as undefined | 'default' | 'tenants',
    };
    let providerStartedAt = 0;

    try {
      const ragActivation = resolveRagEnabledForTenant(this.meta.tenantId);
      ragLog.enabledSource = ragActivation.source;
      if (ragActivation.enabled) {
        const ragStartedAt = Date.now();
        try {
          const ragResult = await retrieveContextMulti({
            tenantId: this.meta.tenantId,
            query: input.user,
            docsLimit: getRagDocsMaxChunks(),
            chatLimit: getRagChatMaxChunks(),
            phoneHash: input.sessionId,
          });
          const docsMinScore = getRagDocsMinScore();
          const chatMinScore = getRagChatMinScore();
          const docsChunks = ragResult.docs.filter((chunk) => chunk.score >= docsMinScore);
          const chatChunks = ragResult.chat.filter((chunk) => chunk.score >= chatMinScore);
          const scoredChunks = [...docsChunks, ...chatChunks];
          const avgScore = scoredChunks.length > 0
            ? (scoredChunks.reduce((sum, chunk) => sum + chunk.score, 0) / scoredChunks.length)
            : 0;
          const minAvgScore = getRagMinAvgScore();
          const qualityGateFailed = scoredChunks.length > 0 && avgScore < minAvgScore;
          const filteredOut = (ragResult.chunks.length > 0 && scoredChunks.length === 0) || qualityGateFailed;
          const ragText = buildContextTextV2(docsChunks, chatChunks);
          const trimmed = ragText.slice(0, getRagMaxContextChars());
          const ragLatencyMs = Date.now() - ragStartedAt;
          const shouldInject = Boolean(trimmed) && !qualityGateFailed;

          ragLog = {
            enabled: shouldInject,
            chunks: scoredChunks.length,
            latencyMs: ragResult.cacheHit ? 0 : ragLatencyMs,
            contextChars: shouldInject ? trimmed.length : 0,
            filteredOut,
            cacheHit: ragResult.cacheHit === true,
            docsChunks: docsChunks.length,
            chatChunks: chatChunks.length,
            avgScore,
            qualityGateFailed,
            enabledSource: ragActivation.source,
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
              ragAvgScore: Number(avgScore.toFixed(4)),
              ragQualityGateFailed: qualityGateFailed,
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
            avgScore: 0,
            qualityGateFailed: false,
            enabledSource: ragActivation.source,
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

      circuitBreaker.recordSuccess(this.meta.tenantId, 'ai');

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
        'rag.avg_score': Number(ragLog.avgScore.toFixed(4)),
        'rag.quality_gate_failed': ragLog.qualityGateFailed,
        'rag.enabled_source': ragLog.enabledSource,
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
        ragAvgScore: Number(ragLog.avgScore.toFixed(4)),
        ragQualityGateFailed: ragLog.qualityGateFailed,
        ragEnabledSource: ragLog.enabledSource ?? null,
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
          ...((): Record<string, unknown> => {
            const [model, source] = resolveFrankModelVersion(this.meta.tenantId);
            return {
              modelVersionId: model.id,
              rolloutSource: source,
            };
          })(),
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
        tokensPrompt: typeof tokenCounts.prompt_tokens === 'number' ? tokenCounts.prompt_tokens : 0,
        tokensCompletion: typeof tokenCounts.completion_tokens === 'number' ? tokenCounts.completion_tokens : 0,
        ragUsed: ragLog.enabled,
        ragChunks: ragLog.chunks,
        ragLatencyMs: ragLog.latencyMs,
      });

      // ── FinOps: enqueue raw usage event (fire-and-forget, never throws) ────────
      void tokenUsageEventsRepository.insertUsageEvent({
        traceId: finalInput.correlationId ?? randomUUID(),
        tenantId: this.meta.tenantId,
        model: effectiveModel,
        inputTokens: typeof tokenCounts.prompt_tokens === 'number' ? tokenCounts.prompt_tokens : 0,
        outputTokens: typeof tokenCounts.completion_tokens === 'number' ? tokenCounts.completion_tokens : 0,
        type: 'usage',
      });

      return result;
    } catch (error) {
      await circuitBreaker.recordFailure(this.meta.tenantId, 'ai');

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
        'rag.avg_score': Number(ragLog.avgScore.toFixed(4)),
        'rag.quality_gate_failed': ragLog.qualityGateFailed,
        'rag.enabled_source': ragLog.enabledSource,
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
