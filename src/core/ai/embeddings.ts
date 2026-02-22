import type { EmbeddingsOutput } from './provider.interface';
import { getAIProvider } from './llm-gateway';

export async function generateEmbeddings(tenantId: string, input: string[]): Promise<EmbeddingsOutput> {
  if (!tenantId) {
    throw new Error('tenantId is required for embeddings');
  }

  if (!input || input.length === 0) {
    throw new Error('input is required for embeddings');
  }

  const provider = await getAIProvider(tenantId);
  return provider.embeddings({ tenantId, input });
}
