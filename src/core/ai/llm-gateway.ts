import { tenantAiProviderRepository } from '../../infra/repositories/tenant-ai-provider.repository';
import { LmStudioProvider } from './providers/lmstudio.provider';
import type { AIProvider } from './provider.interface';

const DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.DEFAULT_AI_TIMEOUT_MS || '20000', 10);

function getDefaultConfig() {
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

export async function getAIProvider(tenantId: string): Promise<AIProvider> {
  if (!tenantId) {
    throw new Error('tenantId is required to resolve AI provider');
  }

  const tenantConfig = await tenantAiProviderRepository.getProviderConfig(tenantId);
  const defaults = getDefaultConfig();

  return new LmStudioProvider({
    baseUrl: tenantConfig?.baseUrl || defaults.baseUrl,
    model: tenantConfig?.model || defaults.model,
    embedModel: tenantConfig?.embedModel || defaults.embedModel,
    apiKey: tenantConfig?.apiKey || undefined,
    timeoutMs: tenantConfig?.timeoutMs || defaults.timeoutMs,
  });
}
