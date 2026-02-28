export interface EmbeddingProvider {
    /**
     * Generates embeddings for an array of input strings.
     * Returns an array of embedding vectors (arrays of numbers).
     */
    embedBatch(texts: string[]): Promise<number[][]>;
}
