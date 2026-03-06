import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectSecurityAnomalies, ANOMALY_THRESHOLDS } from '@/lib/security/anomaly-detector';
import type { SecurityEdgeEventRecord } from '@/drizzle/schema';
import { POST } from '@/app/api/internal/jobs/security-anomaly-scan/route';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { ErrorCode } from '@/infra/http/error-response';

vi.mock('@/infra/auth/guards', () => ({
    requireAdmin: vi.fn(),
}));

vi.mock('@/infra/db', () => ({
    getDb: vi.fn(),
}));

vi.mock('@/infra/log/logger', () => ({
    structuredLogger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('@/infra/http/request-trace', () => ({
    makeRequestId: vi.fn().mockReturnValue('test-req-id'),
}));

// ─── Unit Tests: detectSecurityAnomalies ──────────────────────────────────────

function makeEvents(reason: string, count: number): SecurityEdgeEventRecord[] {
    return Array.from({ length: count }, (_, i) => ({
        id: `${reason}-${i}`,
        requestId: `req-${i}`,
        route: '/api/v1/test',
        reason,
        ipHash: 'ip-hash-1',
        tenantClaim: 'tenant-1',
        userClaim: null,
        createdAt: new Date(),
    }));
}

describe('detectSecurityAnomalies', () => {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 5 * 60 * 1000);

    it('should return no breaches if all counts are below thresholds', () => {
        const events: SecurityEdgeEventRecord[] = [
            ...makeEvents('invalid_jwt', 10),
            ...makeEvents('tenant_mismatch', 5),
        ];
        const result = detectSecurityAnomalies(events, windowStart, now);
        expect(result).toHaveLength(0);
    });

    it('should detect a breach when invalid_jwt exceeds threshold', () => {
        const events = makeEvents('invalid_jwt', ANOMALY_THRESHOLDS['invalid_jwt'] + 5);
        const result = detectSecurityAnomalies(events, windowStart, now);
        expect(result).toHaveLength(1);
        expect(result[0].reason).toBe('invalid_jwt');
        expect(result[0].count).toBe(ANOMALY_THRESHOLDS['invalid_jwt'] + 5);
    });

    it('should detect multiple breaches across different reasons', () => {
        const events: SecurityEdgeEventRecord[] = [
            ...makeEvents('invalid_jwt', ANOMALY_THRESHOLDS['invalid_jwt'] + 1),
            ...makeEvents('tenant_mismatch', ANOMALY_THRESHOLDS['tenant_mismatch'] + 1),
        ];
        const result = detectSecurityAnomalies(events, windowStart, now);
        expect(result).toHaveLength(2);
        const reasons = result.map(b => b.reason);
        expect(reasons).toContain('invalid_jwt');
        expect(reasons).toContain('tenant_mismatch');
    });

    it('should not breach when count equals threshold exactly (threshold is exclusive)', () => {
        const events = makeEvents('header_spoofing', ANOMALY_THRESHOLDS['header_spoofing']);
        const result = detectSecurityAnomalies(events, windowStart, now);
        expect(result).toHaveLength(0);
    });

    it('should report single route when all events share same route', () => {
        const events = makeEvents('invalid_jwt', ANOMALY_THRESHOLDS['invalid_jwt'] + 1);
        const result = detectSecurityAnomalies(events, windowStart, now);
        expect(result[0].route).toBe('/api/v1/test');
    });
});

// ─── Integration Tests: POST /api/internal/jobs/security-anomaly-scan ─────────

const createChainableMock = (resolvedValue: any) => {
    const chainable: any = {
        select: vi.fn(() => chainable),
        from: vi.fn(() => chainable),
        where: vi.fn(() => chainable),
        insert: vi.fn(() => chainable),
        values: vi.fn(() => Promise.resolve()),
        then: (resolve: any) => resolve(resolvedValue),
    };
    return chainable;
};

describe('POST /api/internal/jobs/security-anomaly-scan', () => {
    let mockDb: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockDb = {
            select: vi.fn(),
            insert: vi.fn(() => ({
                values: vi.fn().mockResolvedValue(undefined),
            })),
        };
        (getDb as any).mockResolvedValue(mockDb);
    });

    it('should return 401 if not authenticated', async () => {
        vi.mocked(requireAdmin).mockResolvedValueOnce({
            ok: false,
            code: ErrorCode.AUTH_REQUIRED,
            requestId: 'test-req-id',
            response: new Response(JSON.stringify({ ok: false }), { status: 401 }) as any,
        });

        const req = new Request('http://localhost/api/internal/jobs/security-anomaly-scan', { method: 'POST' });
        const res = await POST(req as any);
        expect(res.status).toBe(401);
    });

    it('should return 0 breaches when no events exceed thresholds', async () => {
        vi.mocked(requireAdmin).mockResolvedValueOnce({
            ok: true,
            requestId: 'test-req-id',
            session: { sub: 'admin', tenantId: 't1', role: 'admin', email: 'a@b.com', sv: 1 },
        });

        // Return 5 events (below all thresholds)
        mockDb.select.mockReturnValueOnce(createChainableMock(makeEvents('invalid_jwt', 5)));

        const req = new Request('http://localhost/api/internal/jobs/security-anomaly-scan', { method: 'POST' });
        const res = await POST(req as any);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.ok).toBe(true);
        expect(json.data.breaches).toBe(0);
        expect(json.data.incidents_created).toBe(0);
    });

    it('should create an incident when threshold is exceeded', async () => {
        vi.mocked(requireAdmin).mockResolvedValueOnce({
            ok: true,
            requestId: 'test-req-id',
            session: { sub: 'admin', tenantId: 't1', role: 'admin', email: 'a@b.com', sv: 1 },
        });

        // Return enough events to trigger invalid_jwt threshold
        const highVolumeEvents = makeEvents('invalid_jwt', ANOMALY_THRESHOLDS['invalid_jwt'] + 10);
        mockDb.select.mockReturnValueOnce(createChainableMock(highVolumeEvents));

        const req = new Request('http://localhost/api/internal/jobs/security-anomaly-scan', { method: 'POST' });
        const res = await POST(req as any);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.ok).toBe(true);
        expect(json.data.breaches).toBe(1);
        expect(json.data.incidents_created).toBe(1);
        expect(json.data.details[0].reason).toBe('invalid_jwt');
        expect(mockDb.insert).toHaveBeenCalledOnce();
    });
});
