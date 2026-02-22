import type { AIProvider, ChatInput, ChatOutput, EmbeddingsInput, EmbeddingsOutput } from '../provider.interface';

export interface LmStudioProviderConfig {
  baseUrl: string;
  model: string;
  embedModel: string;
  apiKey?: string;
  timeoutMs: number;
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface OpenAIEmbeddingsResponse {
  data?: Array<{ embedding?: number[] }>;
}

export class LmStudioProvider implements AIProvider {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly embedModel: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;

  constructor(config: LmStudioProviderConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.model = config.model;
    this.embedModel = config.embedModel;
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs;
  }

  async chat(input: ChatInput): Promise<ChatOutput> {
    const messages = [];

    if (input.system) {
      messages.push({ role: 'system', content: input.system });
    }

    messages.push({ role: 'user', content: input.user });

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
    };

    if (typeof input.temperature === 'number') body.temperature = input.temperature;
    if (typeof input.maxTokens === 'number') body.max_tokens = input.maxTokens;
    if (input.responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }

    const response = await this.request<OpenAIChatResponse>('/v1/chat/completions', body);
    const text = response?.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error('LMStudio chat response missing content');
    }

    return { text, raw: response };
  }

  async embeddings(input: EmbeddingsInput): Promise<EmbeddingsOutput> {
    const body = {
      model: this.embedModel,
      input: input.input,
    };

    const response = await this.request<OpenAIEmbeddingsResponse>('/v1/embeddings', body);
    const vectors = response?.data?.map((item) => item.embedding).filter(Boolean) as number[][] | undefined;

    if (!vectors || vectors.length === 0) {
      throw new Error('LMStudio embeddings response missing vectors');
    }

    return { vectors };
  }

  private async request<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const text = await response.text();
      if (!response.ok) {
        throw new Error(`LMStudio request failed (${response.status}): ${text}`);
      }

      try {
        return JSON.parse(text) as T;
      } catch (parseError) {
        throw new Error(`LMStudio response parse error: ${(parseError as Error).message}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    return headers;
  }
}
