export interface ChatInput {
  tenantId: string;
  system?: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface ChatOutput {
  text: string;
  raw?: unknown;
}

export interface EmbeddingsInput {
  tenantId: string;
  input: string[];
}

export interface EmbeddingsOutput {
  vectors: number[][];
}

export interface AIProvider {
  chat(input: ChatInput): Promise<ChatOutput>;
  embeddings(input: EmbeddingsInput): Promise<EmbeddingsOutput>;
}
