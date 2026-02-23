import { tenantAiProviderRepository } from '../../infra/repositories/tenant-ai-provider.repository';
import type { AIProvider, ChatInput, ChatOutput, EmbeddingsInput, EmbeddingsOutput } from './provider.interface';
import { OpenAICompatibleProvider } from './providers/openai-compatible.provider';

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

  return new DualModelProvider(chatProvider, embeddingsProvider);
}
