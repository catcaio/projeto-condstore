import { beforeEach, describe, expect, it, vi } from 'vitest';
import { scheduleClientFollowUp } from '../schedule-followup';
import { crmRepository } from '@/modules/crm/crm.repository';
import { getTenantId } from '@/modules/audit/audit.actions';
import { operationalAuditService } from '@/modules/audit/operational-audit.service';
import { revalidatePath } from 'next/cache';

vi.mock('@/modules/crm/crm.repository', () => ({
    crmRepository: {
        findActiveOpportunity: vi.fn(),
        createOpportunity: vi.fn(),
        createFollowUp: vi.fn(),
    },
}));

vi.mock('@/modules/audit/audit.actions', () => ({
    getTenantId: vi.fn().mockResolvedValue('tenant-1'),
}));

vi.mock('@/modules/audit/operational-audit.service', () => ({
    operationalAuditService: {
        logActivity: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

describe('scheduleClientFollowUp', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates a new opportunity if none exists', async () => {
        vi.mocked(crmRepository.findActiveOpportunity).mockResolvedValue(null);

        const result = await scheduleClientFollowUp('customer-1');

        expect(result.success).toBe(true);
        expect(crmRepository.createOpportunity).toHaveBeenCalled();
        expect(crmRepository.createFollowUp).toHaveBeenCalled();
        expect(operationalAuditService.logActivity).toHaveBeenCalledWith(expect.objectContaining({
            actionType: 'followup_scheduled',
            entityId: 'customer-1'
        }));
        expect(revalidatePath).toHaveBeenCalled();
    });

    it('reuses existing opportunity if it exists', async () => {
        vi.mocked(crmRepository.findActiveOpportunity).mockResolvedValue({ id: 'op-1' } as any);

        const result = await scheduleClientFollowUp('customer-1');

        expect(result.success).toBe(true);
        expect(crmRepository.createOpportunity).not.toHaveBeenCalled();
        expect(crmRepository.createFollowUp).toHaveBeenCalledWith(expect.objectContaining({
            opportunityId: 'op-1'
        }));
    });

    it('returns error on failure', async () => {
        vi.mocked(crmRepository.findActiveOpportunity).mockRejectedValue(new Error('DB Error'));

        const result = await scheduleClientFollowUp('customer-1');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Erro ao agendar follow-up');
    });
});
