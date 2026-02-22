import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockProviderInstance = {
  chat: vi.fn(),
  embeddings: vi.fn(),
};

const mockConstructor = vi.fn();
const mockGetProviderConfig = vi.fn();

vi.mock('../providers/lmstudio.provider', () => ({
  LmStudioProvider: vi.fn().mockImplementation((config) => {
    mockConstructor(config);
    return mockProviderInstance;
  }),
}));

vi.mock('../../../infra/repositories/tenant-ai-provider.repository', () => ({
  tenantAiProviderRepository: {
    getProviderConfig: (...args: any[]) => mockGetProviderConfig(...args),
  },
}));

import { getAIProvider } from '../llm-gateway';

describe('llm-gateway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEFAULT_LMSTUDIO_BASE_URL = 'http://localhost:1234';
    process.env.DEFAULT_LMSTUDIO_MODEL = 'llm-model';
    process.env.DEFAULT_EMBED_MODEL = 'embed-model';
    process.env.DEFAULT_AI_TIMEOUT_MS = '15000';
    mockGetProviderConfig.mockResolvedValue(null);
  });

  it('uses fallback env config when tenant config is missing', async () => {
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
