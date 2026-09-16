import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCustomerWithContext, findCustomerReferenceByPhone } from '../customer.repository';
import { db } from '@/db/client';

vi.mock('@/db/client', () => {
    const mockSelect = vi.fn();
    return {
        db: {
            select: mockSelect,
        },
    };
});

vi.mock('@/infra/pii/crypto', () => ({
    decryptString: vi.fn((val: string) => `decrypted_${val}`),
}));

describe('Customers Customer Repository', () => {
    const tenantId = 'tenant-123';
    const customerId = 'cust-123';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getCustomerWithContext', () => {
        it('returns null if customer/organization record is not found', async () => {
            const mockLimit = vi.fn().mockResolvedValue([]);
            const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
            const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere });
            const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin });
            (db.select as any).mockReturnValue({ from: mockFrom });

            const result = await getCustomerWithContext(tenantId, customerId);
            expect(result).toBeNull();
        });

        it('returns aggregated customer context when record exists', async () => {
            const mockCustomer = { id: customerId, tenantId, organizationId: 'org-123' };
            const mockOrg = { id: 'org-123', legalName: 'Acme Corp', status: 'active' };

            // 1st select: customer + organization
            const mockLimit1 = vi.fn().mockResolvedValue([{ customer: mockCustomer, organization: mockOrg }]);
            const mockWhere1 = vi.fn().mockReturnValue({ limit: mockLimit1 });
            const mockInnerJoin1 = vi.fn().mockReturnValue({ where: mockWhere1 });

            // 2nd select: contacts
            const mockWhere2 = vi.fn().mockResolvedValue([
                { id: 'ct-1', customerId, phoneEncrypted: 'enc_phone', emailEncrypted: 'enc_email' },
            ]);

            // 3rd select: orders
            const mockLimit3 = vi.fn().mockResolvedValue([{ id: 'ord-1' }]);
            const mockOrderBy3 = vi.fn().mockReturnValue({ limit: mockLimit3 });
            const mockWhere3 = vi.fn().mockReturnValue({ orderBy: mockOrderBy3 });

            // 4th select: simulations
            const mockLimit4 = vi.fn().mockResolvedValue([{ id: 'sim-1' }]);
            const mockOrderBy4 = vi.fn().mockReturnValue({ limit: mockLimit4 });
            const mockWhere4 = vi.fn().mockReturnValue({ orderBy: mockOrderBy4 });

            (db.select as any)
                .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ innerJoin: mockInnerJoin1 }) })
                .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: mockWhere2 }) })
                .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: mockWhere3 }) })
                .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: mockWhere4 }) });

            const result = await getCustomerWithContext(tenantId, customerId);

            expect(result).not.toBeNull();
            expect(result?.customer).toEqual(mockCustomer);
            expect(result?.organization).toEqual(mockOrg);
            expect(result?.contacts[0].phone).toBe('decrypted_enc_phone');
            expect(result?.contacts[0].email).toBe('decrypted_enc_email');
        });
    });

    describe('findCustomerReferenceByPhone', () => {
        it('returns null for invalid or short phone numbers', async () => {
            const result = await findCustomerReferenceByPhone(tenantId, '123');
            expect(result).toBeNull();
        });
    });
});
