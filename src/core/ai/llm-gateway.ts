import { tenantAiProviderRepository } from '../../infra/repositories/tenant-ai-provider.repository';
import { logger } from '../../infra/logger';
import type { AIProvider, ChatInput, ChatOutput, EmbeddingsInput, EmbeddingsOutput } from './provider.interface';
import { OpenAICompatibleProvider } from './providers/openai-compatible.provider';
import { checkTenantRateLimit } from './tenant-rate-limit';

const DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.DEFAULT_AI_TIMEOUT_MS || '20000', 10);

interface DefaultsConfig {
  baseUrl: string;
  model: string;
  embedModel: string;
  timeoutMs: number;
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
    private readonly meta: { tenantId: string; providerType: string; model: string; embedModel: string }
  ) {}

  async chat(input: ChatInput): Promise<ChatOutput> {
    const rate = checkTenantRateLimit(this.meta.tenantId);
    if (!rate.allowed) {
      logger.warn('ai_rate_limit', {
        tenant_id: this.meta.tenantId,
        provider_type: this.meta.providerType,
        model: this.meta.model,
        retry_after_ms: rate.retryAfterMs,
      });
      throw new Error('AI_RATE_LIMIT');
    }

    const startedAt = Date.now();
    try {
      const result = await this.provider.chat(input);
      const latencyMs = Date.now() - startedAt;
      logger.info('ai_chat', {
        tenant_id: this.meta.tenantId,
        provider_type: this.meta.providerType,
        model: this.meta.model,
        latency_ms: latencyMs,
        status: 'ok',
        ...extractTokenCounts(result.raw),
      });
      return result;
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      logger.error('ai_chat_failed', error as Error, {
        tenant_id: this.meta.tenantId,
        provider_type: this.meta.providerType,
        model: this.meta.model,
        latency_ms: latencyMs,
        status: 'error',
        error_code: (error as Error).name || 'UNKNOWN',
      });
      throw error;
    }
  }

  async embeddings(input: EmbeddingsInput): Promise<EmbeddingsOutput> {
    const rate = checkTenantRateLimit(this.meta.tenantId);
    if (!rate.allowed) {
      logger.warn('ai_rate_limit', {
        tenant_id: this.meta.tenantId,
        provider_type: this.meta.providerType,
        model: this.meta.embedModel,
        retry_after_ms: rate.retryAfterMs,
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
  const apiKey = tenantConfig?.apiKeyEncrypted || tenantConfig?.apiKey || undefined;
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

  return new ObservedProvider(new DualModelProvider(chatProvider, embeddingsProvider), {
    tenantId,
    providerType,
    model,
    embedModel: embedModel || model,
  });
}
