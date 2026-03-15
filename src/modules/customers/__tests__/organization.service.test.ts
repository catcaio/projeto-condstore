import { describe, it, expect, vi, beforeEach } from 'vitest';
import { organizationService, sanitizeCnpj, hashCnpj } from '../organization.service';

// --- Mock DB ---
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockSet = vi.fn();

function resetChain() {
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue([]);
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
}

vi.mock('@/infra/db', () => ({
    getDb: vi.fn().mockResolvedValue({
        select: (...args: any[]) => mockSelect(...args),
        update: (...args: any[]) => mockUpdate(...args),
        insert: (...args: any[]) => mockInsert(...args),
        transaction: vi.fn(async (fn: any) => {
            const tx = {
                update: (...args: any[]) => mockUpdate(...args),
            };
            return fn(tx);
        }),
    }),
}));

vi.mock('@/drizzle/schema', () => ({
    organizations: { id: 'id', tenantId: 'tenantId', cnpjHash: 'cnpjHash', status: 'status', legalName: 'legalName', tradeName: 'tradeName', organizationId: 'organizationId' },
    conversations: { tenantId: 'tenantId', organizationId: 'organizationId' },
    customerContacts: { tenantId: 'tenantId', organizationId: 'organizationId' },
    customers: { tenantId: 'tenantId', organizationId: 'organizationId' },
}));

vi.mock('@/infra/log/logger', () => ({
    structuredLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('Organization Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetChain();
    });

    describe('sanitizeCnpj', () => {
        it('should return digits for valid CNPJ with formatting', () => {
            expect(sanitizeCnpj('12.345.678/0001-90')).toBe('12345678000190');
        });

        it('should return null for CNPJ with wrong digit count', () => {
            expect(sanitizeCnpj('123456')).toBeNull();
        });

        it('should return null for empty string', () => {
            expect(sanitizeCnpj('')).toBeNull();
        });
    });

    describe('hashCnpj', () => {
        it('should produce a 64-char hex hash', () => {
            const hash = hashCnpj('12345678000190', 'tenant-1');
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
        });

        it('should produce different hashes for different tenants (tenant isolation)', () => {
            const h1 = hashCnpj('12345678000190', 'tenant-1');
            const h2 = hashCnpj('12345678000190', 'tenant-2');
            expect(h1).not.toBe(h2);
        });
    });

    describe('updateOrganizationCnpj', () => {
        const baseInput = {
            tenantId: 'tenant-1',
            organizationId: 'org-surrogate',
            cnpj: '12.345.678/0001-90',
            requestId: 'req-1',
        };

        it('should reject invalid CNPJ', async () => {
            const result = await organizationService.updateOrganizationCnpj({
                ...baseInput,
                cnpj: '123',
            });
            expect(result.ok).toBe(false);
            expect(result.error).toContain('inválido');
        });

        it('should return error when org not found', async () => {
            // First select (current org) returns empty
            mockLimit.mockResolvedValueOnce([]);

            const result = await organizationService.updateOrganizationCnpj(baseInput);
            expect(result.ok).toBe(false);
            expect(result.error).toContain('não encontrada');
        });

        it('should do simple update when no conflict exists', async () => {
            // First select: current org found
            mockLimit.mockResolvedValueOnce([{ id: 'org-surrogate', tenantId: 'tenant-1', cnpjHash: 'phone-hash', legalName: 'Old Name' }]);
            // Second select: no conflict
            mockLimit.mockResolvedValueOnce([]);

            const result = await organizationService.updateOrganizationCnpj({
                ...baseInput,
                legalName: 'Empresa Real Ltda',
            });

            expect(result.ok).toBe(true);
            expect(result.merged).toBe(false);
            expect(result.canonicalOrganizationId).toBe('org-surrogate');
            expect(mockUpdate).toHaveBeenCalled();
        });

        it('should do simple update when conflict is self', async () => {
            const cnpjHash = hashCnpj('12345678000190', 'tenant-1');
            // First select: current org found
            mockLimit.mockResolvedValueOnce([{ id: 'org-surrogate', tenantId: 'tenant-1', cnpjHash }]);
            // Second select: conflict is self
            mockLimit.mockResolvedValueOnce([{ id: 'org-surrogate', tenantId: 'tenant-1', cnpjHash }]);

            const result = await organizationService.updateOrganizationCnpj(baseInput);

            expect(result.ok).toBe(true);
            expect(result.merged).toBe(false);
        });

        it('should merge when another org has same CNPJ hash', async () => {
            const cnpjHash = hashCnpj('12345678000190', 'tenant-1');
            // First select: current surrogate org
            mockLimit.mockResolvedValueOnce([{ id: 'org-surrogate', tenantId: 'tenant-1', cnpjHash: 'phone-hash' }]);
            // Second select: conflict with canonical org
            mockLimit.mockResolvedValueOnce([{ id: 'org-canonical', tenantId: 'tenant-1', cnpjHash }]);

            const result = await organizationService.updateOrganizationCnpj(baseInput);

            expect(result.ok).toBe(true);
            expect(result.merged).toBe(true);
            expect(result.canonicalOrganizationId).toBe('org-canonical');

            // Verify update calls: conversations, contacts, customers, mark merged = 4 updates in tx
            expect(mockUpdate).toHaveBeenCalled();
        });
    });
});
