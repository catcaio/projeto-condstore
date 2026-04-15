import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockContext = {
    conversation: {
        id: 'conv-1',
        stage: 'NEW_LEAD',
        messages: [],
    },
    customer: null,
    pipeline: {
        recentQuotes: [],
        recentOrders: [],
    },
    operacional: {
        ownerId: null,
        openTasks: [],
        recentNotes: 0,
    },
};

describe('frankSuggestions', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.unstubAllEnvs();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('fails explicitly when OPENAI_API_KEY is missing outside development', async () => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('OPENAI_API_KEY', '');

        const { frankSuggestions } = await import('./frank.suggestions');

        await expect(
            frankSuggestions.generateSuggestions('tenant-a', mockContext),
        ).rejects.toMatchObject({
            name: 'FrankMissingOpenAiApiKeyError',
            message: 'OPENAI_API_KEY is required for Frank copilot outside development',
        });
    });

    it('keeps a safe development fallback when OPENAI_API_KEY is missing locally', async () => {
        vi.stubEnv('NODE_ENV', 'development');
        vi.stubEnv('OPENAI_API_KEY', '');

        const { frankSuggestions } = await import('./frank.suggestions');
        const result = await frankSuggestions.generateSuggestions('tenant-a', mockContext);

        expect(result.suggestedAction).toBe('NONE');
        expect(result.summary).toContain('temporariamente desabilitado');
    });
});
