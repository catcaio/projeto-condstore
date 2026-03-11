import { logger } from '../../infra/logger';

export interface AIHealthResult {
  ok: boolean;
  baseUrl: string | null;
  model: string | null;
  embedModel: string | null;
  skipped?: boolean;
  reason?: string;
  error?: string;
}

function optionalEnv(name: string): string | null {
  const value = process.env[name];
  return value?.trim() || null;
}

function buildModelsUrl(baseUrl: string): string {
  const sanitized = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return sanitized.endsWith('/v1') ? `${sanitized}/models` : `${sanitized}/v1/models`;
}

/**
 * Check AI provider health without throwing.
 *
 * Behavior:
 * - Missing env vars → { ok: false, skipped: true, reason: 'no_ai_provider_configured' }
 * - Provider unreachable → { ok: false, error: '...' }
 * - Provider healthy → { ok: true, baseUrl, model, embedModel }
 *
 * Never throws — callers can safely use the result without try/catch.
 */
export async function checkAIHealth(): Promise<AIHealthResult> {
  const baseUrl = optionalEnv('DEFAULT_LMSTUDIO_BASE_URL') ?? optionalEnv('DEFAULT_CLOUD_BASE_URL');
  const model = optionalEnv('DEFAULT_LMSTUDIO_MODEL');
  const embedModel = optionalEnv('DEFAULT_EMBED_MODEL');

  if (!baseUrl || !model || !embedModel) {
    const missing = [
      !baseUrl ? 'DEFAULT_LMSTUDIO_BASE_URL/DEFAULT_CLOUD_BASE_URL' : null,
      !model ? 'DEFAULT_LMSTUDIO_MODEL' : null,
      !embedModel ? 'DEFAULT_EMBED_MODEL' : null,
    ].filter(Boolean);

    logger.info('ai_health_check_skipped', { missing_envs: missing });

    return {
      ok: false,
      baseUrl: null,
      model: null,
      embedModel: null,
      skipped: true,
      reason: `no_ai_provider_configured (missing: ${missing.join(', ')})`,
    };
  }

  const timeoutMs = Number.parseInt(process.env.DEFAULT_AI_TIMEOUT_MS || '5000', 10);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(buildModelsUrl(baseUrl), {
      method: 'GET',
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = `AI provider /models returned status ${response.status}`;
      logger.error('ai_health_check_failed', new Error(error), {
        base_url: baseUrl,
        model,
        embed_model: embedModel,
      });

      return {
        ok: false,
        baseUrl,
        model,
        embedModel,
        error,
      };
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
    const message = error instanceof Error ? error.message : String(error);
    logger.error('ai_health_check_failed', error as Error, {
      base_url: baseUrl,
      model,
      embed_model: embedModel,
    });

    return {
      ok: false,
      baseUrl,
      model,
      embedModel,
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}
