import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ------ Hoisted mocks ------

const mockInsertUsageEvent = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockInsertEvent = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockGetProviderConfig = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());

const mockChatFn = vi.hoisted(() =>
    vi.fn().mockResolvedValue({
        text: 'Olá!',
        raw: {
            usage: { prompt_tokens: 42, completion_tokens: 18, total_tokens: 60 },
        },
    })
);

vi.mock('../providers/openai-compatible.provider', () => {
    class OpenAICompatibleProvider {
        // eslint-disable-next-line @typescript-eslint/no-useless-constructor
        constructor(_config: unknown) { }
        chat = mockChatFn;
        embeddings = vi.fn().mockResolvedValue({ embeddings: [] });
    }
    return { OpenAICompatibleProvider };
});

vi.mock('../../../infra/repositories/tenant-ai-provider.repository', () => ({
    tenantAiProviderRepository: {
        getProviderConfig: (...args: any[]) => mockGetProviderConfig(...args),
    },
}));

vi.mock('../../../infra/repositories/frank-events.repository', () => ({
    frankEventsRepository: { insertEvent: mockInsertEvent },
}));

vi.mock('../../../infra/repositories/token-usage-events.repository', () => ({
    tokenUsageEventsRepository: { insertUsageEvent: mockInsertUsageEvent },
}));

vi.mock('../../../infra/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../infra/rate-limit/redis-rate-limiter', () => ({
    checkRedisRateLimit: (...args: any[]) => mockCheckRateLimit(...args),
}));

vi.mock('../retrieval/retrieve-context', () => ({
    retrieveContextMulti: vi.fn().mockResolvedValue({
        docs: [], chat: [], chunks: [], cacheHit: false,
    }),
}));

vi.mock('../model-registry', () => ({
    resolveFrankModelVersion: vi.fn().mockReturnValue([{ id: 'test-version' }, 'default']),
}));

vi.mock('../tenant-state-resolver', () => ({
    getTenantState: vi.fn().mockResolvedValue({ state: 'unlocked', revision: 1, source: 'redis' }),
}));

// ------ Tests ------

// Import AFTER all mocks are registered (vi.mock is hoisted, so this is safe)
const { getAIProvider } = await import('../llm-gateway');

describe('FinOps: token_usage_events', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv('NODE_ENV', 'development');
        vi.stubEnv('DEFAULT_LMSTUDIO_BASE_URL', 'http://localhost:1234');
        vi.stubEnv('DEFAULT_LMSTUDIO_MODEL', 'gpt-4o-mini');
        vi.stubEnv('DEFAULT_EMBED_MODEL', 'embed-model');
        vi.stubEnv('DEFAULT_AI_TIMEOUT_MS', '15000');
        mockGetProviderConfig.mockResolvedValue(null);
        mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 10, resetAt: Date.now() + 60000 });
        // Note: vi.resetModules() removed — it breaks hoisted mock context with dynamic imports
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('test_token_event_inserted_after_llm_call', async () => {
        const provider = await getAIProvider('tenant-finops');

        await provider.chat({
            tenantId: 'tenant-finops',
            user: 'Quanto custa o frete?',
            correlationId: 'trace-abc-123',
        });

        // Allow fire-and-forget microtask to flush
        await new Promise((r) => setTimeout(r, 10));

        expect(mockInsertUsageEvent).toHaveBeenCalledTimes(1);
        expect(mockInsertUsageEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                traceId: 'trace-abc-123',
                tenantId: 'tenant-finops',
                model: 'gpt-4o-mini',
                inputTokens: 42,
                outputTokens: 18,
                type: 'usage',
            })
        );
    });

    it('test_token_event_uses_random_uuid_when_no_correlationId', async () => {
        const provider = await getAIProvider('tenant-finops');

        // No correlationId → gateway should fall back to randomUUID()
        await provider.chat({ tenantId: 'tenant-finops', user: 'Olá' });
        await new Promise((r) => setTimeout(r, 10));

        expect(mockInsertUsageEvent).toHaveBeenCalledTimes(1);
        const call = mockInsertUsageEvent.mock.calls[0][0];
        // traceId must be a valid UUID
        expect(call.traceId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
    });
});
