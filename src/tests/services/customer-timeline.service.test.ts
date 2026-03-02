import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks have to be hoisted
vi.mock('@/infra/repositories/customer-timeline.repository', () => ({
    customerTimelineRepository: {
        create: vi.fn(),
    }
}));
vi.mock('@/infra/repositories/customer-accounts.repository', () => ({
    customerAccountsRepository: {
        getByUserIdAndOrganizationId: vi.fn(),
    }
}));

import { customerTimelineService } from '@/infra/events/customer-timeline.service';
import { customerTimelineRepository } from '@/infra/repositories/customer-timeline.repository';
import { customerAccountsRepository } from '@/infra/repositories/customer-accounts.repository';
import { InfrastructureError } from '@/infra/errors';

describe('Customer Timeline Service', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const validPayload = {
        organizationId: 'org-123',
        entityType: 'QUOTE' as const,
        entityId: 'quote-456',
        status: 'QUOTE_IN_PROGRESS',
        messagePublic: 'Sua cotação está sendo gerada.',
        metadataJson: {
            cnpj: '12.345.678/0001-90',
            password: 'secret_password_here',
            publicField: 'safe_data'
        }
    };

    it('Should reject if no session is provided (401 mapping)', async () => {
        const ctx = { tenantId: null, userId: undefined };

        await expect(customerTimelineService.publishCustomerTimelineEvent(ctx, validPayload))
            .rejects.toThrowError(InfrastructureError);

        try {
            await customerTimelineService.publishCustomerTimelineEvent(ctx, validPayload);
        } catch (e: any) {
            expect(e.code).toBe('UNAUTHORIZED');
        }
    });

    it('Should reject if user has no access to organization (403 mapping)', async () => {
        const ctx = { tenantId: 'tenant-123', userId: 'user-xyz' };

        // Mock DB: user is not part of this org
        (customerAccountsRepository.getByUserIdAndOrganizationId as any).mockResolvedValue(null);

        await expect(customerTimelineService.publishCustomerTimelineEvent(ctx, validPayload))
            .rejects.toThrowError(InfrastructureError);

        try {
            await customerTimelineService.publishCustomerTimelineEvent(ctx, validPayload);
        } catch (e: any) {
            expect(e.code).toBe('FORBIDDEN');
        }
    });

    it('Should publish event and redact sensitive fields when access is permitted', async () => {
        const ctx = { tenantId: 'tenant-123', userId: 'user-xyz' };

        // Mock DB: user has access
        (customerAccountsRepository.getByUserIdAndOrganizationId as any).mockResolvedValue({ id: 'acc-1' });

        // Mock DB: create response
        (customerTimelineRepository.create as any).mockImplementation((data: any) => Promise.resolve(data));

        const result = await customerTimelineService.publishCustomerTimelineEvent(ctx, validPayload);

        expect(customerTimelineRepository.create).toHaveBeenCalledOnce();

        // Verify Redaction
        expect((result.metadataJson as any).cnpj).toBe('[REDACTED]');
        expect((result.metadataJson as any).password).toBe('[REDACTED]');
        expect((result.metadataJson as any).publicField).toBe('safe_data');
        expect(result.tenantId).toBe('tenant-123');
        expect(result.organizationId).toBe('org-123');
    });
});
