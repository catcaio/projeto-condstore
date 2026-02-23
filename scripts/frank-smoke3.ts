/**
 * Frank Smoke Test #3
 * Usage: npx tsx --env-file=.env --env-file=.env.local scripts/frank-smoke3.ts <tenantId>
 *
 * Valida stack de IA ponta-a-ponta:
 *  1. Garante DATABASE_URL + DEFAULT_* no process.env
 *  2. Upserta tenant_ai_providers (providerType=shared) via repositório
 *  3. Chama getAIProviderWithMeta() e imprime OK_PROVIDER
 *  4. Faz chat "ping" e imprime OK_CHAT_REPLY
 *
 * NÃO usa dotenv — lê process.env diretamente.
 */

import { TenantAIProviderRepository } from '../src/infra/repositories/tenant-ai-provider.repository';
import { getAIProviderWithMeta } from '../src/core/ai/llm-gateway';

// ──────────────────────────────────────────────
// 1. Validar variáveis de ambiente
// ──────────────────────────────────────────────
function validateEnv(): {
  tenantId: string;
  dbUrl: string;
  baseUrl: string;
  model: string;
  embedModel: string;
  timeoutMs: number;
} {
  const tenantId = process.argv[2];
  if (!tenantId) {
    console.error('[FAIL] Informe o tenantId como argumento: npx tsx scripts/frank-smoke3.ts <tenantId>');
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('[FAIL] DATABASE_URL não está definida no environment.');
    console.error('       Rode: npx tsx --env-file=.env --env-file=.env.local scripts/frank-smoke3.ts ' + tenantId);
    process.exit(1);
  }

  const baseUrl = process.env.DEFAULT_LMSTUDIO_BASE_URL;
  const model = process.env.DEFAULT_LMSTUDIO_MODEL;
  const embedModel = process.env.DEFAULT_EMBED_MODEL;

  if (!baseUrl || !model || !embedModel) {
    const missing = [
      !baseUrl && 'DEFAULT_LMSTUDIO_BASE_URL',
      !model && 'DEFAULT_LMSTUDIO_MODEL',
      !embedModel && 'DEFAULT_EMBED_MODEL',
    ].filter(Boolean);
    console.error('[FAIL] Variáveis ausentes: ' + missing.join(', '));
    process.exit(1);
  }

  const timeoutMs = Number.parseInt(process.env.DEFAULT_AI_TIMEOUT_MS ?? '20000', 10);

  // Exibe vars (mascarando DATABASE_URL)
  const maskedDbUrl = dbUrl.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  console.log('[ENV] DATABASE_URL  =', maskedDbUrl);
  console.log('[ENV] BASE_URL      =', baseUrl);
  console.log('[ENV] MODEL         =', model);
  console.log('[ENV] EMBED_MODEL   =', embedModel);
  console.log('[ENV] TIMEOUT_MS    =', timeoutMs);
  console.log('[ENV] NODE_ENV      =', process.env.NODE_ENV ?? '(not set — will default to dev behaviour)');

  return { tenantId, dbUrl, baseUrl, model, embedModel, timeoutMs };
}

// ──────────────────────────────────────────────
// 2. Upsert provider no banco
// ──────────────────────────────────────────────
async function upsertProvider(tenantId: string, baseUrl: string, model: string, embedModel: string, timeoutMs: number) {
  console.log('\n[STEP 1] Upserting tenant_ai_providers para tenantId=' + tenantId + ' ...');
  const repo = new TenantAIProviderRepository();
  await repo.upsertProviderConfig(tenantId, {
    providerType: 'shared',
    baseUrl,
    model,
    embedModel,
    timeoutMs,
    isEnabled: true,
  });
  console.log('[STEP 1] OK_PROVIDER — upsert concluído.');
}

// ──────────────────────────────────────────────
// 3. Resolver provider via gateway
// ──────────────────────────────────────────────
async function resolveProvider(tenantId: string) {
  console.log('\n[STEP 2] Chamando getAIProviderWithMeta(tenantId=' + tenantId + ') ...');
  const { provider, meta } = await getAIProviderWithMeta(tenantId);
  console.log('[STEP 2] Provider resolvido:', JSON.stringify(meta, null, 2));
  return { provider, meta };
}

// ──────────────────────────────────────────────
// 4. Chat ping
// ──────────────────────────────────────────────
async function chatPing(provider: Awaited<ReturnType<typeof resolveProvider>>['provider'], tenantId: string) {
  console.log('\n[STEP 3] Enviando chat ping para LM Studio ...');
  const result = await provider.chat({
    tenantId,
    system: 'Responda apenas: OK',
    user: 'ping',
    responseFormat: 'text',
  });
  console.log('[STEP 3] OK_CHAT_REPLY =', result.text.trim());
  return result;
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────
async function main() {
  console.log('=== Frank Smoke Test #3 ===\n');
  const { tenantId, baseUrl, model, embedModel, timeoutMs } = validateEnv();

  try {
    await upsertProvider(tenantId, baseUrl, model, embedModel, timeoutMs);
  } catch (err) {
    const e = err as Error;
    console.error('[FAIL] upsertProvider:', e.message);
    console.error('       Stack:', e.stack);
    process.exit(2);
  }

  let provider: Awaited<ReturnType<typeof resolveProvider>>['provider'];
  try {
    const resolved = await resolveProvider(tenantId);
    provider = resolved.provider;
  } catch (err) {
    const e = err as Error;
    console.error('[FAIL] resolveProvider:', e.message);
    process.exit(3);
  }

  try {
    await chatPing(provider, tenantId);
  } catch (err) {
    const e = err as Error;
    console.error('[FAIL] chatPing:', e.message);
    process.exit(4);
  }

  console.log('\n=== SMOKE OK: OK_PROVIDER + OK_CHAT_REPLY ===');
  process.exit(0);
}

main();
