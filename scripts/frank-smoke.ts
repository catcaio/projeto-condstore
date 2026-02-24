import "dotenv/config";
import { tenantAiProviderRepository } from "../src/infra/repositories/tenant-ai-provider.repository";
import { getAIProviderWithMeta } from "../src/core/ai/llm-gateway";

const tenantId = process.argv[2] ?? "lojacond-default";

async function main() {
  await tenantAiProviderRepository.upsertProviderConfig(tenantId, {
    providerType: "shared",
    baseUrl: process.env.DEFAULT_LMSTUDIO_BASE_URL!,
    model: process.env.DEFAULT_LMSTUDIO_MODEL!,
    embedModel: process.env.DEFAULT_EMBED_MODEL!,
    apiKey: process.env.LMSTUDIO_API_KEY ?? null,
    timeoutMs: Number(process.env.DEFAULT_AI_TIMEOUT_MS ?? "20000"),
    isEnabled: true,
  });

  const { provider, meta } = await getAIProviderWithMeta(tenantId);

  const r = await provider.chat({
    tenantId,
    system: "Você é um smoke test. Responda apenas: OK",
    user: "ping",
    responseFormat: "text",
  });

  console.log("OK_PROVIDER", { tenantId, provider: meta.providerType, model: meta.model });
  console.log("OK_CHAT_REPLY:", r.text);
}

main().catch((e) => { console.error(e); process.exit(1); });
