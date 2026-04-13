import { describe, expect, it, vi } from 'vitest';
import { GET } from '../[id]/draft/route';
import { FrankDailyLimitExceededError } from '@/modules/frank/frank.errors';

const mockGenerateCopilotSuggestions = vi.hoisted(() => vi.fn());

vi.mock('@/modules/frank/server', () => ({
    frankService: {
        generateCopilotSuggestions: (...args: unknown[]) => mockGenerateCopilotSuggestions(...args),
    },
}));

vi.mock('@/infra/auth/guards', () => ({
    requireAdmin: vi.fn().mockResolvedValue({
        ok: true,
        session: {
            tenantId: 'tenant-a',
            sub: 'operator-a',
        },
    }),
}));

describe('GET /api/cockpit/frank/suggestions/[id]/draft', () => {
    it('returns 429 with explicit payload when the Frank daily limit is exceeded', async () => {
        mockGenerateCopilotSuggestions.mockRejectedValue(
            new FrankDailyLimitExceededError('tenant-a', 1200, 1000),
        );

        const request = new Request('http://localhost/api/cockpit/frank/suggestions/conv-1/draft');
        const response = await GET(request as never, {
            params: Promise.resolve({ id: 'conv-1' }),
        });
        const json = await response.json();

        expect(response.status).toBe(429);
        expect(json.error.code).toBe('RATE_LIMITED');
        expect(json.error.details).toEqual({
            dailyLimit: 1000,
            usedTokens: 1200,
        });
    });
});
