import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../route';
import { getSessionUser } from '@/infra/auth/session';
import { getFrankAssistMetrics } from '@/modules/frank/frank-assist-metrics.service';

vi.mock('@/infra/auth/session', () => ({
    getSessionUser: vi.fn(),
}));

vi.mock('@/modules/frank/frank-assist-metrics.service', () => ({
    getFrankAssistMetrics: vi.fn(),
}));

describe('GET /api/cockpit/metrics/frank', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getSessionUser).mockResolvedValue({
            sub: 'user-1',
            email: 'admin@example.com',
            tenantId: 'tenant-session',
            role: 'admin',
            sv: 1,
        });
        vi.mocked(getFrankAssistMetrics).mockResolvedValue({
            tenantId: 'tenant-session',
            generatedAt: '2026-03-12T00:00:00.000Z',
            range: {
                from: '2026-03-01T00:00:00.000Z',
                to: '2026-03-12T00:00:00.000Z',
                period: '30d',
                granularity: 'day',
            },
            kpis: {
                totalInteractions: 3,
                totalHandoffs: 1,
                handoffRate: 33.3,
                avgResponseTimeMs: 240,
                uniqueSessions: 2,
                knowledgeUsed: 0,
                suggestionsGenerated: 0,
                suggestionsApproved: 0,
                suggestionsEdited: 0,
                suggestionsRejected: 0,
                memoryContextHits: 0,
            },
            intents: [],
            tools: [],
            fallbackReasons: [],
            volume: [],
            sessions: [],
            sourceSummary: {
                primarySource: 'operational_events',
                eventsUsed: ['frank_assist_response'],
                availableFields: ['intent'],
                notes: [],
            },
        });
    });

    it('returns tenant-scoped metrics for the authenticated session', async () => {
        const request = {
            nextUrl: new URL('http://localhost/api/cockpit/metrics/frank?period=7d&outcome=success'),
            headers: new Headers(),
            cookies: { get: vi.fn() },
        } as never;

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.ok).toBe(true);
        expect(json.data.tenantId).toBe('tenant-session');
        expect(getFrankAssistMetrics).toHaveBeenCalledWith(
            expect.objectContaining({
                tenantId: 'tenant-session',
                period: '7d',
                outcome: 'success',
            }),
        );
    });

    it('rejects cross-tenant requests', async () => {
        const request = {
            nextUrl: new URL('http://localhost/api/cockpit/metrics/frank?tenantId=other-tenant'),
            headers: new Headers(),
            cookies: { get: vi.fn() },
        } as never;

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(403);
        expect(json).toMatchObject({
            error: 'Cross-tenant access forbidden'
        });
        expect(getFrankAssistMetrics).not.toHaveBeenCalled();
    });
});
