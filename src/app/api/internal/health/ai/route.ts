/**
 * GET /api/internal/health/ai
 *
 * Testa conectividade com o servidor LM Studio (ou provider configurado).
 *
 * Fluxo:
 *  1. Lê DEFAULT_LMSTUDIO_BASE_URL (ou DEFAULT_* do ambiente)
 *  2. Chama GET {baseUrl}/models  para verificar que o servidor está UP
 *  3. Retorna { ok, baseUrl, model, embedModel, latencyMs }
 *
 * Resposta 200:
 *   { ok: true, baseUrl, model, embedModel, latencyMs }
 * Resposta 503:
 *   { ok: false, error: string, baseUrl, model, embedModel }
 *
 * NÃO requer autenticação interna (rota interna de infra), mas deve ser
 * protegida por firewall/WAF em produção.
 */

export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { logger } from '../../../../infra/logger';

interface ModelsResponse {
  data?: unknown[];
  object?: string;
}

function getAIConfig() {
  const baseUrl = process.env.DEFAULT_LMSTUDIO_BASE_URL;
  const model = process.env.DEFAULT_LMSTUDIO_MODEL;
  const embedModel = process.env.DEFAULT_EMBED_MODEL;
  const timeoutMs = Number.parseInt(process.env.DEFAULT_AI_TIMEOUT_MS ?? '20000', 10);

  if (!baseUrl || !model || !embedModel) {
    const missing = [
      !baseUrl && 'DEFAULT_LMSTUDIO_BASE_URL',
      !model && 'DEFAULT_LMSTUDIO_MODEL',
      !embedModel && 'DEFAULT_EMBED_MODEL',
    ].filter(Boolean) as string[];
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ''), model, embedModel, timeoutMs };
}

async function checkModelsEndpoint(baseUrl: string, timeoutMs: number): Promise<ModelsResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`LM Studio /models returned HTTP ${response.status}: ${text.slice(0, 200)}`);
    }

    try {
      return JSON.parse(text) as ModelsResponse;
    } catch {
      throw new Error(`LM Studio /models response is not valid JSON: ${text.slice(0, 200)}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const startedAt = Date.now();

  let config: ReturnType<typeof getAIConfig>;
  try {
    config = getAIConfig();
  } catch (err) {
    const error = (err as Error).message;
    logger.warn('health_ai.config_missing', { error });
    return NextResponse.json({ ok: false, error }, { status: 503 });
  }

  const { baseUrl, model, embedModel, timeoutMs } = config;

  try {
    const modelsData = await checkModelsEndpoint(baseUrl, timeoutMs);
    const latencyMs = Date.now() - startedAt;
    const modelCount = Array.isArray(modelsData?.data) ? modelsData.data.length : null;

    logger.info('health_ai.ok', { baseUrl, model, embedModel, latencyMs, modelCount });

    return NextResponse.json(
      {
        ok: true,
        baseUrl,
        model,
        embedModel,
        latencyMs,
        modelCount,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    const error = (err as Error).message;
    const latencyMs = Date.now() - startedAt;

    logger.error('health_ai.failed', err as Error, { baseUrl, model, embedModel, latencyMs });

    return NextResponse.json(
      {
        ok: false,
        error,
        baseUrl,
        model,
        embedModel,
        latencyMs,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
