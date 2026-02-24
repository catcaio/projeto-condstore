import { logger } from '../../infra/logger';

export interface AIHealthResult {
  ok: boolean;
  baseUrl: string;
  model: string;
  embedModel: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function buildModelsUrl(baseUrl: string): string {
  const sanitized = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return sanitized.endsWith('/v1') ? `${sanitized}/models` : `${sanitized}/v1/models`;
}

export async function checkAIHealth(): Promise<AIHealthResult> {
  const baseUrl = requireEnv('DEFAULT_LMSTUDIO_BASE_URL');
  const model = requireEnv('DEFAULT_LMSTUDIO_MODEL');
  const embedModel = requireEnv('DEFAULT_EMBED_MODEL');
  const timeoutMs = Number.parseInt(process.env.DEFAULT_AI_TIMEOUT_MS || '20000', 10);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(buildModelsUrl(baseUrl), {
      method: 'GET',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`LM Studio /models returned status ${response.status}`);
    }

    logger.info('ai_health_check_ok', {
      base_url: baseUrl,
      model,
      embed_model: embedModel,
    });

    return {
      ok: true,
      baseUrl,
      model,
      embedModel,
    };
  } catch (error) {
    logger.error('ai_health_check_failed', error as Error, {
      base_url: baseUrl,
      model,
      embed_model: embedModel,
    });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
