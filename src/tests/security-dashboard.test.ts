import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/internal/security/events/route';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { ErrorCode } from '@/infra/http/error-response';

vi.mock('@/infra/auth/guards', () => ({
    requireAdmin: vi.fn(),
}));

vi.mock('@/infra/http/request-trace', () => ({
    makeRequestId: vi.fn().mockReturnValue('test-req-id'),
}));

vi.mock('@/infra/db', () => ({
    getDb: vi.fn(),
}));

const createChainableMock = (resolvedValue: any) => {
    const chainable: any = {
        from: vi.fn(() => chainable),
        where: vi.fn(() => chainable),
        groupBy: vi.fn(() => chainable),
        orderBy: vi.fn(() => chainable),
        limit: vi.fn(() => chainable),
        then: (resolve: any) => resolve(resolvedValue),
    };
    return chainable;
};

describe('Security Dashboard API', () => {
    let mockDb: any;

    beforeEach(async () => {
        vi.clearAllMocks();

        mockDb = {
            select: vi.fn(),
        };
        (getDb as any).mockResolvedValue(mockDb);
    });

    it('should return 401 if unauthorized', async () => {
        vi.mocked(requireAdmin).mockResolvedValueOnce({
            ok: false,
            code: ErrorCode.AUTH_REQUIRED,
            requestId: 'test-req-id',
            response: new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 401 }) as any,
        });

        const req = new Request('http://localhost/api/internal/security/events');
        const res = await GET(req as any);
        expect(res.status).toBe(401);
    });

    it('should aggregate metrics correctly', async () => {
        vi.mocked(requireAdmin).mockResolvedValueOnce({
            ok: true,
            requestId: 'test-req-id',
            session: { sub: 'admin', tenantId: 'tenant-1', role: 'admin', email: 'admin@condstore.com', sv: 1 },
        });

        const now = new Date();
        const testBucket = Math.floor(now.getTime() / 1000);

        mockDb.select
            .mockReturnValueOnce(createChainableMock([{ count: 3 }])) // total events
            .mockReturnValueOnce(createChainableMock([{ reason: 'invalid_jwt', count: 2 }, { reason: 'rate_limit_exceeded', count: 1 }])) // events by type
            .mockReturnValueOnce(createChainableMock([{ ipHash: 'ip-1', count: 2 }])) // top ip hash
            .mockReturnValueOnce(createChainableMock([{ route: '/api/v1/data', count: 2 }])) // top routes
            .mockReturnValueOnce(createChainableMock([{
                id: '1',
                timestamp: now,
                route: '/api/v1/data',
                reason: 'invalid_jwt',
                ipHash: 'ip-1',
                tenantClaim: 't1'
            }])) // incidents
            .mockReturnValueOnce(createChainableMock([{ bucket: testBucket, count: 3 }])); // events last 24h

        const req = new Request('http://localhost/api/internal/security/events');
        const res = await GET(req as any);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.ok).toBe(true);
        expect(json.data.total_events).toBe(3);
        expect(json.data.events_by_type.invalid_jwt).toBe(2);
        expect(json.data.events_by_type.rate_limit_exceeded).toBe(1);
        expect(json.data.top_ip_hash[0].ip_hash).toBe('ip-1');
        expect(json.data.top_ip_hash[0].count).toBe(2);
        expect(json.data.top_routes[0].route).toBe('/api/v1/data');
        expect(json.data.incidents.length).toBe(1);
        expect(json.data.events_last_24h.length).toBe(1);
    });
});
