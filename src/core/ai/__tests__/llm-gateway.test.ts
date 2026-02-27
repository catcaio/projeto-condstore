import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOpenAIProviderInstance = vi.hoisted(() => ({
  chat: vi.fn(),
  embeddings: vi.fn(),
}));

const mockOpenAIConstructor = vi.hoisted(() => vi.fn());
const mockGetProviderConfig = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockGetTenantState = vi.hoisted(() => vi.fn().mockResolvedValue({ state: 'unlocked', revision: 1, source: 'redis' }));

vi.mock('../tenant-state-resolver', () => ({
  getTenantState: (...args: any[]) => mockGetTenantState(...args),
}));

const mockGetActivePrompt = vi.hoisted(() => vi.fn().mockResolvedValue(null));
vi.mock('../prompt-registry', () => ({
  promptRegistry: {
    getActivePrompt: (...args: any[]) => mockGetActivePrompt(...args)
  }
}));

const mockSanitizeInput = vi.hoisted(() => vi.fn((t: string) => t));
vi.mock('../pii-redactor', () => ({
  piiRedactor: { sanitizeInput: (t: string) => mockSanitizeInput(t) }
}));

const mockDetectInjection = vi.hoisted(() => vi.fn().mockReturnValue(false));
vi.mock('../injection-guard', () => ({
  injectionGuard: { detectInjection: (t: string) => mockDetectInjection(t) }
}));

vi.mock('../providers/openai-compatible.provider', () => {
  class OpenAICompatibleProvider {
    constructor(config: unknown) {
      mockOpenAIConstructor(config);
      return mockOpenAIProviderInstance as unknown as OpenAICompatibleProvider;
    }
  }

  return { OpenAICompatibleProvider };
});

vi.mock('../../../infra/repositories/tenant-ai-provider.repository', () => ({
  tenantAiProviderRepository: {
    getProviderConfig: (...args: any[]) => mockGetProviderConfig(...args),
  },
}));

vi.mock('../../../infra/repositories/frank-events.repository', () => ({
  frankEventsRepository: {
    insertEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../infra/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

vi.mock('../../../infra/rate-limit/redis-rate-limiter', () => ({
  checkRedisRateLimit: (...args: any[]) => mockCheckRateLimit(...args),
}));

vi.mock('../retrieval/retrieve-context', () => ({
  retrieveContextMulti: vi.fn().mockResolvedValue({
    docs: [],
    chat: [],
    chunks: [],
    cacheHit: false,
  }),
}));

vi.mock('../model-registry', () => ({
  resolveFrankModelVersion: vi.fn().mockReturnValue([{ id: 'test-model-version' }, 'default']),
}));

describe('llm-gateway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEFAULT_LMSTUDIO_BASE_URL = 'http://localhost:1234';
    process.env.DEFAULT_LMSTUDIO_MODEL = 'llm-model';
    process.env.DEFAULT_EMBED_MODEL = 'embed-model';
    process.env.DEFAULT_AI_TIMEOUT_MS = '15000';
    mockGetProviderConfig.mockResolvedValue(null);
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 10, resetAt: Date.now() + 60000 });
    vi.resetModules();
  });

  it('uses fallback env config when tenant config is missing', async () => {
    const { getAIProvider } = await import('../llm-gateway');
    await getAIProvider('tenant-1');

    expect(mockOpenAIConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'http://localhost:1234',
        model: 'llm-model',
        apiKey: undefined,
        timeoutMs: 15000,
      })
    );
  });

  it('uses tenant-specific config when available', async () => {
    mockGetProviderConfig.mockResolvedValueOnce({
      baseUrl: 'http://tenant-ai:9999',
      model: 'tenant-model',
      embedModel: 'tenant-embed',
      resolvedApiKey: 'secret',
      timeoutMs: 25000,
      isEnabled: 1,
    });

    const { getAIProvider } = await import('../llm-gateway');
    await getAIProvider('tenant-2');

    expect(mockOpenAIConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'http://tenant-ai:9999',
        model: 'tenant-model',
        apiKey: 'secret',
        timeoutMs: 25000,
      })
    );
  });

  it('blocks chat when rate limit is exceeded', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });
    const { getAIProvider } = await import('../llm-gateway');
    const provider = await getAIProvider('tenant-3');
    await expect(provider.chat({ tenantId: 'tenant-3', user: 'Oi' })).rejects.toThrow('AI_RATE_LIMIT');
  });

  it('blocks chat completely and returns Upsell response when tenant is locked', async () => {
    mockGetTenantState.mockResolvedValueOnce({ state: 'locked', revision: 2, source: 'redis' });
    const { getAIProvider } = await import('../llm-gateway');
    const provider = await getAIProvider('tenant-locked');

    const result = await provider.chat({ tenantId: 'tenant-locked', user: 'Oi' }) as any;
    expect(result).toEqual({
      error: 'BUDGET_LOCKED',
      message: 'Orçamento mensal atingido.',
      upgradeRequired: true
    });

    // Assegura que provider underlying e rate limit nunca rodaram.
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(mockOpenAIProviderInstance.chat).not.toHaveBeenCalled();
  });

  it('uses active prompt from registry and sanitizes PII when routing chat', async () => {
    mockGetActivePrompt.mockResolvedValueOnce({
      version: 'v2.0.0',
      system: 'Registry Prompt',
      temperature: 0.5,
      maxTokens: 150
    });
    mockSanitizeInput.mockReturnValueOnce('sanitized-user-input');
    mockDetectInjection.mockReturnValueOnce(true);

    const { getAIProvider } = await import('../llm-gateway');
    const provider = await getAIProvider('tenant-1');

    mockOpenAIProviderInstance.chat.mockResolvedValueOnce({ raw: {}, text: 'Hello' });

    await provider.chat({ tenantId: 'tenant-1', user: 'raw-user-input', route: 'sales' });

    expect(mockGetActivePrompt).toHaveBeenCalledWith('cockpit:sales');
    expect(mockDetectInjection).toHaveBeenCalledWith('raw-user-input');
    expect(mockSanitizeInput).toHaveBeenCalledWith('raw-user-input');

    // The inner provider should receive the modified payload
    expect(mockOpenAIProviderInstance.chat).toHaveBeenCalledWith(
      expect.objectContaining({
        system: 'Registry Prompt',
        user: 'sanitized-user-input',
        temperature: 0.5,
        maxTokens: 150
      })
    );
  });
});
