import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLmProviderInstance = vi.hoisted(() => ({
  chat: vi.fn(),
  embeddings: vi.fn(),
}));

const mockOpenAIProviderInstance = vi.hoisted(() => ({
  chat: vi.fn(),
  embeddings: vi.fn(),
}));

const mockLmConstructor = vi.hoisted(() => vi.fn());
const mockOpenAIConstructor = vi.hoisted(() => vi.fn());
const mockGetProviderConfig = vi.hoisted(() => vi.fn());
const mockLoggerWarn = vi.hoisted(() => vi.fn());

vi.mock('../providers/lmstudio.provider', () => {
  class LmStudioProvider {
    constructor(config: unknown) {
      mockLmConstructor(config);
      return mockLmProviderInstance as unknown as LmStudioProvider;
    }
  }

  return { LmStudioProvider };
});

vi.mock('../providers/openai.provider', () => {
  class OpenAIProvider {
    constructor(config: unknown) {
      mockOpenAIConstructor(config);
      return mockOpenAIProviderInstance as unknown as OpenAIProvider;
    }
  }

  return { OpenAIProvider };
});

vi.mock('../../../infra/repositories/tenant-ai-provider.repository', () => ({
  tenantAiProviderRepository: {
    getProviderConfig: (...args: any[]) => mockGetProviderConfig(...args),
  },
}));

vi.mock('../../../infra/logger', () => ({
  logger: {
    warn: (...args: any[]) => mockLoggerWarn(...args),
  },
}));

describe('llm-gateway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEFAULT_LMSTUDIO_BASE_URL = 'http://localhost:1234';
    process.env.DEFAULT_LMSTUDIO_MODEL = 'llm-model';
    process.env.DEFAULT_EMBED_MODEL = 'embed-model';
    process.env.DEFAULT_AI_TIMEOUT_MS = '15000';
    delete process.env.OPENAI_API_KEY;
    delete process.env.DEFAULT_CLOUD_MODEL;
    delete process.env.DEFAULT_CLOUD_BASE_URL;
    mockGetProviderConfig.mockResolvedValue(null);
    vi.resetModules();
  });

  it('uses fallback env config when tenant config is missing', async () => {
    const { getAIProvider } = await import('../llm-gateway');
    const provider = await getAIProvider('tenant-1');

    expect(provider).toBe(mockLmProviderInstance);
    expect(mockLmConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'http://localhost:1234',
        model: 'llm-model',
        embedModel: 'embed-model',
        timeoutMs: 15000,
      })
    );
  });

  it('uses tenant-specific config when available', async () => {
    mockGetProviderConfig.mockResolvedValueOnce({
      baseUrl: 'http://tenant-ai:9999',
      model: 'tenant-model',
      embedModel: 'tenant-embed',
      apiKey: 'secret',
      timeoutMs: 25000,
    });

    const { getAIProvider } = await import('../llm-gateway');
    await getAIProvider('tenant-2');

    expect(mockLmConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'http://tenant-ai:9999',
        model: 'tenant-model',
        embedModel: 'tenant-embed',
        apiKey: 'secret',
        timeoutMs: 25000,
      })
    );
  });

  it('routes cloud tenants to OpenAI provider', async () => {
    process.env.OPENAI_API_KEY = 'openai-key';
    process.env.DEFAULT_CLOUD_MODEL = 'gpt-4o-mini';

    mockGetProviderConfig.mockResolvedValueOnce({
      providerType: 'cloud',
      baseUrl: 'https://tenant-cloud.example/v1',
      model: 'tenant-cloud-model',
      embedModel: 'tenant-cloud-embed',
      apiKey: 'tenant-openai-key',
      timeoutMs: 21000,
    });

    const { getAIProvider } = await import('../llm-gateway');
    const provider = await getAIProvider('tenant-cloud');

    expect(provider).toBe(mockOpenAIProviderInstance);
    expect(mockOpenAIConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'https://tenant-cloud.example/v1',
        model: 'tenant-cloud-model',
        embedModel: 'tenant-cloud-embed',
        apiKey: 'tenant-openai-key',
        timeoutMs: 21000,
      })
    );
    expect(mockLmConstructor).not.toHaveBeenCalled();
  });

  it('falls back to cloud provider when primary LM Studio fails with retryable error', async () => {
    process.env.OPENAI_API_KEY = 'openai-key';
    process.env.DEFAULT_CLOUD_MODEL = 'gpt-4o-mini';
    process.env.DEFAULT_CLOUD_BASE_URL = 'https://api.openai.com/v1';

    mockLmProviderInstance.chat.mockRejectedValueOnce(new TypeError('fetch failed'));
    mockOpenAIProviderInstance.chat.mockResolvedValueOnce({ text: 'fallback ok' });

    const { getAIProvider } = await import('../llm-gateway');
    const provider = await getAIProvider('tenant-fallback');
    const result = await provider.chat({ tenantId: 'tenant-fallback', user: 'Oi' });

    expect(result).toEqual({ text: 'fallback ok' });
    expect(mockLmProviderInstance.chat).toHaveBeenCalledTimes(1);
    expect(mockOpenAIProviderInstance.chat).toHaveBeenCalledTimes(1);
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'ai_fallback',
      expect.objectContaining({
        tenantId: 'tenant-fallback',
        primary: 'lmstudio',
        secondary: 'cloud',
        erro: 'fetch failed',
      }),
      expect.any(TypeError)
    );
  });
});
