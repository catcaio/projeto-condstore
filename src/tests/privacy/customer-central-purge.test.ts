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
    makeRequestId: () => 'req-123'
}));
vi.mock('@/modules/privacy/vector-purge.service', () => ({
    vectorPurgeService: { deleteEmbeddingsByUser: vi.fn() }
}));

// Mock the admin session guard — allow by default for existing functional tests
const mockRequireAdminSession = vi.fn();
vi.mock('@/infra/auth/tenant-route-guard', () => ({
    requireAdminSession: (...args: any[]) => mockRequireAdminSession(...args),
}));

import { DELETE as purgeUserRoute } from '@/app/api/tenants/[tenantId]/privacy/purge-user/route';
import { getDb } from '@/infra/db';

describe('LGPD Purge User Route (Customer Central)', () => {
    let mockTx: any;
    let mockDb: any;
    let mockRequest: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Default: admin session passes with matching tenant
        mockRequireAdminSession.mockResolvedValue({
            ok: true,
            sessionUser: { sub: 'admin-1', tenantId: 'tenant-1', role: 'admin' },
            tenantId: 'tenant-1',
        });

        mockTx = {
            delete: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
            update: vi.fn().mockReturnThis(),
            set: vi.fn().mockReturnThis(),
        };

        mockDb = {
            transaction: vi.fn(async (cb) => cb(mockTx)),
        };

        (getDb as any).mockResolvedValue(mockDb);

        mockRequest = {
            json: vi.fn(),
            headers: {
                get: vi.fn().mockReturnValue('127.0.0.1')
            }
        };
    });

    it('Should return 400 if validation fails (no phoneHash and no organizationId)', async () => {
        mockRequest.json.mockResolvedValue({ source: 'test' });

        const response = await purgeUserRoute(mockRequest, { params: Promise.resolve({ tenantId: 'tenant-1' }) } as any);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error.message).toBe('Missing phoneHash or organizationId in payload.');
    });

    it('Should wipe organization data when organizationId is provided', async () => {
        mockRequest.json.mockResolvedValue({ organizationId: 'org-abc' });

        const response = await purgeUserRoute(mockRequest, { params: Promise.resolve({ tenantId: 'tenant-1' }) } as any);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(mockDb.transaction).toHaveBeenCalled();

        // Assert deletes
        expect(mockTx.delete).toHaveBeenCalled();

        // Assert anonymizations (timeline)
        expect(mockTx.update).toHaveBeenCalled();
        expect(mockTx.set).toHaveBeenCalledWith({ messagePublic: '[REDACTED]', metadataJson: null });
        expect(data.message).toBe('User permanently forgotten');
    });
});
