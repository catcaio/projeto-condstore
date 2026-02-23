import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockProviderInstance = vi.hoisted(() => ({
  chat: vi.fn(),
  embeddings: vi.fn(),
}));

const mockConstructor = vi.hoisted(() => vi.fn());
const mockGetProviderConfig = vi.hoisted(() => vi.fn());

vi.mock('../providers/lmstudio.provider', () => {
  class LmStudioProvider {
    constructor(config: unknown) {
      mockConstructor(config);
      return mockProviderInstance as unknown as LmStudioProvider;
    }
  }

  return { LmStudioProvider };
});

vi.mock('../../../infra/repositories/tenant-ai-provider.repository', () => ({
  tenantAiProviderRepository: {
    getProviderConfig: (...args: any[]) => mockGetProviderConfig(...args),
  },
}));

describe('llm-gateway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEFAULT_LMSTUDIO_BASE_URL = 'http://localhost:1234';
    process.env.DEFAULT_LMSTUDIO_MODEL = 'llm-model';
    process.env.DEFAULT_EMBED_MODEL = 'embed-model';
    process.env.DEFAULT_AI_TIMEOUT_MS = '15000';
    mockGetProviderConfig.mockResolvedValue(null);
    vi.resetModules();
  });

  it('uses fallback env config when tenant config is missing', async () => {
    const { getAIProvider } = await import('../llm-gateway');
    const provider = await getAIProvider('tenant-1');

    expect(provider).toBe(mockProviderInstance);
    expect(mockConstructor).toHaveBeenCalledWith(
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

    expect(mockConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'http://tenant-ai:9999',
        model: 'tenant-model',
        embedModel: 'tenant-embed',
        apiKey: 'secret',
        timeoutMs: 25000,
      })
    );
  });
});
