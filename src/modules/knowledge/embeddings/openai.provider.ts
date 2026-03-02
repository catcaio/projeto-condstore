import { EmbeddingProvider } from './provider';
import { BusinessError, ErrorCode } from '../../../infra/errors';
import { logger } from '../../../infra/logger';

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
    private apiKey: string;
    private maxRetries = 3;
    private model = 'text-embedding-3-small';

    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY || '';
    }

    private async delay(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async embedBatch(texts: string[]): Promise<number[][]> {
        if (!this.apiKey) {
            const error = new Error('Embeddings não configurado (RAG desabilitado ou OPENAI_API_KEY ausente).');
            (error as any).code = 'embeddings_not_configured';
            throw error;
        }

        if (!texts || texts.length === 0) return [];

        let attempts = 0;

        while (attempts < this.maxRetries) {
            try {
                // OpenAI allows max 2048 or so, but user requested batch up to ~100 or simply what's given.
                // It's safe to assume texts is under 100 since the caller will slice it.

                const response = await fetch('https://api.openai.com/v1/embeddings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                    body: JSON.stringify({
                        input: texts,
                        model: this.model,
                    }),
                    // 15 seconds fetch timeout safety
                    signal: AbortSignal.timeout(15000),
                });

                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(`OpenAI Embedding HTTP ${response.status}: ${text}`);
                }

                const data = await response.json();

                // Return exactly in the order requested.
                // data.data is an array of { embedding: [], index: 0 }
                return texts.map((_, i) => data.data.find((d: any) => d.index === i)?.embedding || []);

            } catch (error: any) {
                attempts++;
                logger.warn(`Embedding batch failed, attempt ${attempts}/${this.maxRetries}`, undefined, error as Error);

                if (attempts >= this.maxRetries) {
                    throw new BusinessError(
                        "INTERNAL_ERROR" as any,
                        'Failed to generate embeddings via OpenAI provider after retries'
                    );
                }

                // Exponential backoff
                await this.delay(Math.pow(2, attempts) * 1000);
            }
        }

        return [];
    }
}
