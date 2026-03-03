import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/infra/db', () => ({
    getDb: vi.fn(),
}));
vi.mock('@/infra/repositories/end-user-consent.repository', () => ({
    endUserConsentRepository: {
        revokeConsent: vi.fn(),
    }
}));
vi.mock('@/infra/http/request-trace', () => ({
    makeRequestId: () => 'req-test-123'
}));
vi.mock('@/modules/privacy/vector-purge.service', () => ({
    vectorPurgeService: { deleteEmbeddingsByUser: vi.fn() }
}));

// Mock the admin session guard
const mockRequireAdminSession = vi.fn();
vi.mock('@/infra/auth/tenant-route-guard', () => ({
    requireAdminSession: (...args: any[]) => mockRequireAdminSession(...args),
}));

import { DELETE as purgeUserRoute } from '@/app/api/tenants/[tenantId]/privacy/purge-user/route';
import { NextResponse } from 'next/server';

describe('Purge-user RBAC enforcement (P0)', () => {
    let mockRequest: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockRequest = {
            json: vi.fn().mockResolvedValue({ phoneHash: 'hash123' }),
            headers: { get: vi.fn().mockReturnValue('127.0.0.1') }
        };
    });

    it('should return 401 when no session exists', async () => {
        mockRequireAdminSession.mockResolvedValue({
            ok: false,
            response: NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }),
        });

        const response = await purgeUserRoute(mockRequest, { params: Promise.resolve({ tenantId: 'tenant-1' }) } as any);
        expect(response.status).toBe(401);
    });

    it('should return 403 when user is not admin', async () => {
        mockRequireAdminSession.mockResolvedValue({
            ok: false,
            response: NextResponse.json({ error: 'FORBIDDEN', message: 'Admin role required' }, { status: 403 }),
        });

        const response = await purgeUserRoute(mockRequest, { params: Promise.resolve({ tenantId: 'tenant-1' }) } as any);
        expect(response.status).toBe(403);
    });

    it('should return 403 on tenant mismatch', async () => {
        mockRequireAdminSession.mockResolvedValue({
            ok: true,
            sessionUser: { sub: 'user1', tenantId: 'tenant-OTHER', role: 'admin' },
            tenantId: 'tenant-OTHER',
        });

        const response = await purgeUserRoute(mockRequest, { params: Promise.resolve({ tenantId: 'tenant-1' }) } as any);
        expect(response.status).toBe(403);
        const data = await response.json();
        expect(data.message).toBe('Tenant mismatch');
    });
});
