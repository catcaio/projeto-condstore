import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveCustomerByPhone } from './identity-resolver.service';
import { getDb } from '@/infra/db';
import { normalizePhone, hashPhone } from '@/lib/phone/normalize-phone';

vi.mock('@/infra/db', () => {
    const mockSelect = vi.fn();
    return {
        getDb: vi.fn().mockResolvedValue({
            select: mockSelect,
        })
    };
});

describe('Identity Resolver Service', () => {
    const tenantId = 'tenant-123';
    const rawPhone = '(48) 99999-9999';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns null if normalizer fails', async () => {
        const result = await resolveCustomerByPhone(tenantId, 'invalid');
        expect(result).toBeNull();
        expect(getDb).not.toHaveBeenCalled();
    });

    it('resolves customer ids by exact hash match', async () => {
        const mockWhere = vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
                contactId: 'contact-1',
                organizationId: 'org-1',
                customerId: 'cust-1'
            }])
        });
        const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
        const dbInstance = await getDb();
        (dbInstance.select as any).mockReturnValue({ from: mockFrom });

        const result = await resolveCustomerByPhone(tenantId, rawPhone);

        expect(result).toEqual({
            contactId: 'contact-1',
            organizationId: 'org-1',
            customerId: 'cust-1',
            confidenceScore: 1.0
        });

        // Ensure db client is correctly accessed
        expect(getDb).toHaveBeenCalled();
    });

    it('returns null if no record matched', async () => {
        const mockWhere = vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
        });
        const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
        const dbInstance = await getDb();
        (dbInstance.select as any).mockReturnValue({ from: mockFrom });

        const result = await resolveCustomerByPhone(tenantId, rawPhone);

        expect(result).toBeNull();
    });

    it('handles query failures gracefully', async () => {
        const mockWhere = vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('DB connection failed'))
        });
        const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
        const dbInstance = await getDb();
        (dbInstance.select as any).mockReturnValue({ from: mockFrom });

        const result = await resolveCustomerByPhone(tenantId, rawPhone);
        expect(result).toBeNull();
    });
});
