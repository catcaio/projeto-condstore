import { tenantAiProviderRepository } from "../src/infra/repositories/tenant-ai-provider.repository";
import { getAIProviderWithMeta } from "../src/core/ai/llm-gateway";

const tenantId = process.argv[2] ?? "lojacond-default";
const baseUrl = process.argv[3] ?? "http://127.0.0.1:1234/v1";

async function fetchFirstModelId() {
  const url = `${baseUrl.replace(/\/+$/,'')}/models`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`LMSTUDIO_MODELS_HTTP_${res.status} ${await res.text()}`);
  const json = await res.json() as any;
  const id = json?.data?.[0]?.id;
  if (!id) throw new Error("LMSTUDIO_NO_MODELS_LOADED");
  return id as string;
}

async function main() {
  const modelId = await fetchFirstModelId();

  await tenantAiProviderRepository.upsertProviderConfig(tenantId, {
    providerType: "shared",
    baseUrl,
    model: modelId,
    embedModel: modelId,
    apiKey: process.env.LMSTUDIO_API_KEY ?? null,
    timeoutMs: 20000,
    isEnabled: true,
  });

  const { provider, meta } = await getAIProviderWithMeta(tenantId);
  const r = await provider.chat({
    tenantId,
    system: "Responda apenas: OK",
    user: "ping",
    responseFormat: "text",
  });

  console.log("OK_PROVIDER", { tenantId, baseUrl, model: meta.model });
  console.log("OK_CHAT_REPLY", r.text);
}

main().catch((e) => { console.error(e); process.exit(1); });
