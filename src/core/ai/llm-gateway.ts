import { tenantAiProviderRepository } from '../../infra/repositories/tenant-ai-provider.repository';
import { logger } from '../../infra/logger';
import { LmStudioProvider } from './providers/lmstudio.provider';
import { OpenAIProvider } from './providers/openai.provider';
import type { AIProvider } from './provider.interface';

const DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.DEFAULT_AI_TIMEOUT_MS || '20000', 10);
const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';

type ProviderName = 'lmstudio' | 'cloud';

interface LmDefaults {
  baseUrl: string;
  model: string;
  embedModel: string;
  timeoutMs: number;
}

interface CloudProviderConfig {
  baseUrl: string;
  model: string;
  embedModel: string;
  apiKey: string;
  timeoutMs: number;
}

function getLmStudioDefaults(): LmDefaults {
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

function buildCloudProviderConfig(overrides: Partial<CloudProviderConfig> = {}): CloudProviderConfig {
  const baseUrl = overrides.baseUrl || process.env.DEFAULT_CLOUD_BASE_URL || DEFAULT_OPENAI_BASE_URL;
  const model = overrides.model || process.env.DEFAULT_CLOUD_MODEL;
  const embedModel = overrides.embedModel || process.env.DEFAULT_EMBED_MODEL;
  const apiKey = overrides.apiKey || process.env.OPENAI_API_KEY;
  const timeoutMs = overrides.timeoutMs || DEFAULT_TIMEOUT_MS;

  if (!model || !embedModel || !apiKey) {
    throw new Error('Missing OPENAI_API_KEY, DEFAULT_CLOUD_MODEL or DEFAULT_EMBED_MODEL for cloud provider');
  }

  return {
    baseUrl,
    model,
    embedModel,
    apiKey,
    timeoutMs,
  };
}

function isRetryableAIError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as Error & { code?: string; cause?: unknown };
  const message = `${candidate.message || ''}`.toLowerCase();
  const code = `${candidate.code || ''}`.toLowerCase();

  if (candidate.name === 'AbortError') return true;
  if (message.includes('timeout') || message.includes('timed out') || message.includes('fetch failed')) return true;
  if (code === 'etimedout' || code === 'econnreset' || code === 'econnrefused' || code === 'enotfound') return true;

  const statusMatch = candidate.message?.match(/\((\d{3})\)/);
  if (statusMatch) {
    const status = Number.parseInt(statusMatch[1], 10);
    return status >= 500 && status < 600;
  }

  return false;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

class FallbackAIProvider implements AIProvider {
  constructor(
    private readonly tenantId: string,
    private readonly primaryName: ProviderName,
    private readonly primary: AIProvider,
    private readonly secondaryName: ProviderName,
    private readonly secondary: AIProvider
  ) {}

  async chat(input: Parameters<AIProvider['chat']>[0]): ReturnType<AIProvider['chat']> {
    try {
      return await this.primary.chat(input);
    } catch (error) {
      if (!isRetryableAIError(error)) {
        throw error;
      }

      logger.warn(
        'ai_fallback',
        {
          tenantId: this.tenantId,
          primary: this.primaryName,
          secondary: this.secondaryName,
          erro: getErrorMessage(error),
        },
        error as Error
      );

      return this.secondary.chat(input);
    }
  }

  async embeddings(input: Parameters<AIProvider['embeddings']>[0]): ReturnType<AIProvider['embeddings']> {
    try {
      return await this.primary.embeddings(input);
    } catch (error) {
      if (!isRetryableAIError(error)) {
        throw error;
      }

      logger.warn(
        'ai_fallback',
        {
          tenantId: this.tenantId,
          primary: this.primaryName,
          secondary: this.secondaryName,
          erro: getErrorMessage(error),
        },
        error as Error
      );

      return this.secondary.embeddings(input);
    }
  }
}

export async function getAIProvider(tenantId: string): Promise<AIProvider> {
  if (!tenantId) {
    throw new Error('tenantId is required to resolve AI provider');
  }

  const tenantConfig = await tenantAiProviderRepository.getProviderConfig(tenantId);

  const primaryName: ProviderName = tenantConfig?.providerType === 'cloud' ? 'cloud' : 'lmstudio';
  const primaryProvider =
    primaryName === 'cloud'
      ? new OpenAIProvider(
          buildCloudProviderConfig({
            baseUrl: tenantConfig?.baseUrl || undefined,
            model: tenantConfig?.model || undefined,
            embedModel: tenantConfig?.embedModel || undefined,
            apiKey: tenantConfig?.apiKey || undefined,
            timeoutMs: tenantConfig?.timeoutMs || undefined,
          })
        )
      : (() => {
          const defaults = getLmStudioDefaults();
          return new LmStudioProvider({
            baseUrl: tenantConfig?.baseUrl || defaults.baseUrl,
            model: tenantConfig?.model || defaults.model,
            embedModel: tenantConfig?.embedModel || defaults.embedModel,
            apiKey: tenantConfig?.apiKey || undefined,
            timeoutMs: tenantConfig?.timeoutMs || defaults.timeoutMs,
          });
        })();

  if (primaryName === 'cloud') {
    return primaryProvider;
  }

  let secondaryProvider: AIProvider | null = null;
  try {
    secondaryProvider = new OpenAIProvider(buildCloudProviderConfig());
  } catch {
    secondaryProvider = null;
  }

  if (!secondaryProvider) {
    return primaryProvider;
  }

  return new FallbackAIProvider(tenantId, primaryName, primaryProvider, 'cloud', secondaryProvider);
}
