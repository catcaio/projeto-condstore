import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

const mockDbExecute = vi.hoisted(() => vi.fn());
const mockDbSelect = vi.hoisted(() => vi.fn());
const mockDbInsert = vi.hoisted(() => vi.fn());

vi.mock('@/infra/db', () => ({
    getDb: vi.fn().mockResolvedValue({
        execute: mockDbExecute,
        select: mockDbSelect,
        insert: mockDbInsert,
    }),
}));

vi.mock('@/infra/auth/session', () => ({
    createSessionToken: vi.fn().mockResolvedValue('mock-session-token'),
    COOKIE_NAME: 'condstore_session',
}));

describe('seed-admin route tenant isolation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDbInsert.mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
        });
        process.env.IS_DEV = 'true';
        process.env.SEED_TOKEN = 'test-token';
        process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/condstore_dev';
        process.env.ADMIN_SEED_EMAIL = 'admin@condstore.local';
        process.env.ADMIN_SEED_PASSWORD = 'strong-password-123';
        delete process.env.ADMIN_SEED_TENANT_ID;
    });

    it('rejects seed admin request without explicit tenantId when tenants already exist', async () => {
        // Mock that database already has 2 tenants
        mockDbExecute.mockResolvedValueOnce([[{ count: 2 }]]);

        const req = new NextRequest('http://localhost:3000/api/auth/seed-admin', {
            method: 'GET',
            headers: {
                'x-seed-token': 'test-token',
            },
        });

        const res = await GET(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain('tenantId is required when existing tenants are present');
    });

    it('rejects seed admin request with non-existent tenantId when tenants exist', async () => {
        // Mock count = 2, then select tenant where id = ... returns empty
        mockDbExecute
            .mockResolvedValueOnce([[{ count: 2 }]])
            .mockResolvedValueOnce([[]]); // tenant not found

        const req = new NextRequest('http://localhost:3000/api/auth/seed-admin?tenantId=tenant-non-existent', {
            method: 'GET',
            headers: {
                'x-seed-token': 'test-token',
            },
        });

        const res = await GET(req);
        const data = await res.json();

        expect(res.status).toBe(404);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Cannot associate admin to non-existent tenant');
    });

    it('correctly associates admin with explicitly targeted tenant among multiple tenants', async () => {
        const targetTenant = 'tenant-beta-corp';

        // Mock count = 2, then select tenant where id = targetTenant returns tenant
        mockDbExecute
            .mockResolvedValueOnce([[{ count: 2 }]])
            .mockResolvedValueOnce([[{ id: targetTenant }]]);

        // Mock select signup policy -> returns empty, then mock select existing user -> returns empty
        mockDbSelect
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([]),
                }),
            })
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([]),
                }),
            });

        mockDbInsert.mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
        });

        const req = new NextRequest(`http://localhost:3000/api/auth/seed-admin?tenantId=${targetTenant}`, {
            method: 'GET',
            headers: {
                'x-seed-token': 'test-token',
            },
        });

        const res = await GET(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.tenantId).toBe(targetTenant);
    });
});
