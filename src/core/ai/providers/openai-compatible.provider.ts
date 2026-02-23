import type { AIProvider, ChatInput, ChatOutput, EmbeddingsInput, EmbeddingsOutput } from '../provider.interface';

export interface OpenAICompatibleConfig {
  baseUrl: string;
  apiKey?: string;
  model: string;
  timeoutMs: number;
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface OpenAIEmbeddingsResponse {
  data?: Array<{ embedding?: number[] }>;
  usage?: {
    prompt_tokens?: number;
    total_tokens?: number;
  };
}

export class OpenAICompatibleProvider implements AIProvider {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(config: OpenAICompatibleConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.model = config.model;
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

    const response = await this.request<OpenAIChatResponse>('/chat/completions', body);
    const text = response?.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error('OpenAI-compatible chat response missing content');
    }

    return { text, raw: response };
  }

  async embeddings(input: EmbeddingsInput): Promise<EmbeddingsOutput> {
    const body = {
      model: this.model,
      input: input.input,
    };

    const response = await this.request<OpenAIEmbeddingsResponse>('/embeddings', body);
    const vectors = response?.data?.map((item) => item.embedding).filter(Boolean) as number[][] | undefined;

    if (!vectors || vectors.length === 0) {
      throw new Error('OpenAI-compatible embeddings response missing vectors');
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
        throw new Error(`OpenAI-compatible request failed (${response.status}): ${text}`);
      }

      try {
        return JSON.parse(text) as T;
      } catch (parseError) {
        throw new Error(`OpenAI-compatible response parse error: ${(parseError as Error).message}`);
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
