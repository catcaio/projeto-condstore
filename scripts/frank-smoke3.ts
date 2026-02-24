import { tenantAiProviderRepository } from "../src/infra/repositories/tenant-ai-provider.repository.js";
import { getAIProviderWithMeta } from "../src/core/ai/llm-gateway.js";

const tenantId = process.argv[2] ?? "lojacond-default";
const baseUrl = process.env.DEFAULT_LMSTUDIO_BASE_URL ?? "http://127.0.0.1:1234/v1";
const model = process.env.DEFAULT_LMSTUDIO_MODEL ?? "qwen2.5-7b-instruct-1m";
const embedModel = process.env.DEFAULT_EMBED_MODEL ?? "text-embedding-nomic-embed-text-v1.5";
const timeoutMs = Number(process.env.DEFAULT_AI_TIMEOUT_MS ?? "20000");

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  if (!baseUrl || !model || !embedModel) throw new Error("DEFAULT_* envs are required");

  await tenantAiProviderRepository.upsertProviderConfig(tenantId, {
    providerType: "shared",
    baseUrl,
    model,
    embedModel,
    apiKey: process.env.LMSTUDIO_API_KEY ?? null,
    timeoutMs,
    isEnabled: true,
  });

  const { provider, meta } = await getAIProviderWithMeta(tenantId);

  const r = await provider.chat({
    tenantId,
    system: "Responda apenas: OK",
    user: "ping",
    responseFormat: "text",
  });

  console.log("OK_PROVIDER", { tenantId, baseUrl, model: meta.model, embedModel: meta.embedModel });
  console.log("OK_CHAT_REPLY", r.text);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
