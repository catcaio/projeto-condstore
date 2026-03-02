import { EmbeddingProvider } from './provider';

export class DisabledEmbeddingProvider implements EmbeddingProvider {
    async embedBatch(texts: string[]): Promise<number[][]> {
        const error = new Error('Embeddings não configurado (RAG desabilitado ou OPENAI_API_KEY ausente).');
        (error as any).code = 'embeddings_not_configured';
        throw error;
    }
}
