import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

// Mock redis client
vi.mock('@/infra/redis.client', () => ({
    redisClient: {
        keys: vi.fn(),
        get: vi.fn(),
    }
}));

// Mock the admin session guard
const mockRequireAdminSession = vi.fn();
vi.mock('@/infra/auth/tenant-route-guard', () => ({
    requireAdminSession: (...args: any[]) => mockRequireAdminSession(...args),
}));

import { GET as rateLimitRoute } from '../rate-limit/route';
import { GET as rateLimitAlertsRoute } from '../rate-limit-alerts/route';

describe('Metrics RBAC enforcement (P1)', () => {
    let mockRequest: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockRequest = {
            url: 'http://localhost/api/metrics/rate-limit',
        };
    });

    describe('GET /api/metrics/rate-limit', () => {
        it('should return 401 when no session exists', async () => {
            mockRequireAdminSession.mockResolvedValueOnce({
                ok: false,
                response: NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }),
            });

            const response = await rateLimitRoute(mockRequest);
            expect(response.status).toBe(401);
        });

        it('should return 403 when user is not admin', async () => {
            mockRequireAdminSession.mockResolvedValueOnce({
                ok: false,
                response: NextResponse.json({ error: 'FORBIDDEN', message: 'Admin role required' }, { status: 403 }),
            });

            const response = await rateLimitRoute(mockRequest);
            expect(response.status).toBe(403);
        });

        it('should return 200 when user is admin', async () => {
            mockRequireAdminSession.mockResolvedValueOnce({
                ok: true,
                sessionUser: { sub: 'user1', tenantId: 'tenant-1', role: 'admin' },
                tenantId: 'tenant-1',
            });

            const { redisClient } = await import('@/infra/redis.client');
            vi.mocked(redisClient.keys).mockResolvedValueOnce([]);

            const response = await rateLimitRoute(mockRequest);
            expect(response.status).toBe(200);

            const data = await response.json();
            expect(data.tenantId).toBe('tenant-1');
        });
    });

    describe('GET /api/metrics/rate-limit-alerts', () => {
        it('should return 401 when no session exists', async () => {
            mockRequireAdminSession.mockResolvedValueOnce({
                ok: false,
                response: NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }),
            });

            const response = await rateLimitAlertsRoute(mockRequest);
            expect(response.status).toBe(401);
        });

        it('should return 403 when user is not admin', async () => {
            mockRequireAdminSession.mockResolvedValueOnce({
                ok: false,
                response: NextResponse.json({ error: 'FORBIDDEN', message: 'Admin role required' }, { status: 403 }),
            });

            const response = await rateLimitAlertsRoute(mockRequest);
            expect(response.status).toBe(403);
        });

        it('should return 200 when user is admin', async () => {
            mockRequireAdminSession.mockResolvedValueOnce({
                ok: true,
                sessionUser: { sub: 'user1', tenantId: 'tenant-1', role: 'admin' },
                tenantId: 'tenant-1',
            });

            const { redisClient } = await import('@/infra/redis.client');
            vi.mocked(redisClient.get).mockResolvedValueOnce([] as any);

            const response = await rateLimitAlertsRoute(mockRequest);
            expect(response.status).toBe(200);

            const data = await response.json();
            expect(data.tenantId).toBe('tenant-1');
        });
    });
});
