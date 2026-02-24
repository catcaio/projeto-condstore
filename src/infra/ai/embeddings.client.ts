const DEFAULT_LMSTUDIO_BASE_URL = 'http://127.0.0.1:1234/v1';
const DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.DEFAULT_AI_TIMEOUT_MS || '20000', 10);
const EMBED_BATCH_SIZE = 32;

interface EmbeddingsApiResponse {
  data?: Array<{ embedding?: number[] }>;
}

function getEmbeddingsBaseUrl(): string {
  return (process.env.DEFAULT_LMSTUDIO_BASE_URL || DEFAULT_LMSTUDIO_BASE_URL).replace(/\/+$/, '');
}

function getEmbeddingsModel(): string {
  const model = process.env.DEFAULT_EMBED_MODEL;
  if (!model) {
    throw new Error('DEFAULT_EMBED_MODEL is required for embeddings');
  }
  return model;
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const apiKey = process.env.LMSTUDIO_API_KEY || process.env.OPENAI_API_KEY;
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return headers;
}

async function requestEmbeddingsBatch(texts: string[], model: string): Promise<number[][]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${getEmbeddingsBaseUrl()}/embeddings`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        model,
        input: texts,
      }),
      signal: controller.signal,
    });

    const bodyText = await response.text();
    if (!response.ok) {
      throw new Error(`Embeddings request failed (${response.status}): ${bodyText}`);
    }

    let body: EmbeddingsApiResponse;
    try {
      body = JSON.parse(bodyText) as EmbeddingsApiResponse;
    } catch (err) {
      throw new Error(`Embeddings response parse error: ${(err as Error).message}`);
    }

    const vectors = (body.data ?? [])
      .map((item) => item.embedding)
      .filter((v): v is number[] => Array.isArray(v));

    if (vectors.length !== texts.length) {
      throw new Error(`Embeddings count mismatch: expected ${texts.length}, got ${vectors.length}`);
    }

    return vectors;
  } finally {
    clearTimeout(timeout);
  }
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (!Array.isArray(texts) || texts.length === 0) return [];

  const model = getEmbeddingsModel();
  const vectors: number[][] = [];

  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    const batchVectors = await requestEmbeddingsBatch(batch, model);
    vectors.push(...batchVectors);
  }

  return vectors;
}

