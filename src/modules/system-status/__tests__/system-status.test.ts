import { describe, it, expect, vi } from 'vitest';
import { getSystemStatus } from '../../../app/(app)/cockpit/system-status/queries';
import { planEnforcementService } from '../../finops/plan-enforcement.service';

vi.mock('../../finops/plan-enforcement.service', () => ({
    planEnforcementService: {
        getPlanStatus: vi.fn().mockResolvedValue({
            state: 'unlocked',
            maxPercent: 50,
            usage: { whatsapp_outbound_per_month: 50, freight_simulations_per_month: 20 },
            limits: { whatsapp_outbound_per_month: 100, freight_simulations_per_month: 50 }
        })
    }
}));

// Mock DB partially since full mock is complex, we'll let getSystemStatus run. 
// If it fails due to no real DB, we could mock getDb. But the test rule allows hitting local DB for e2e tests 
// or returning basic structures. Let's mock getDb to return empty counts.
vi.mock('../../../infra/db', () => ({
    getDb: vi.fn().mockResolvedValue({
        select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            catch: vi.fn().mockResolvedValue([{}]),
            then: vi.fn().mockImplementation((cb) => cb([{ date: new Date(), docsTotal: 0, readyTotal: 0, failedTotal: 0 }]))
        }),
        execute: vi.fn().mockResolvedValue(true)
    })
}));

describe('System Status & Health Checks', () => {

    it('returns structured health payload', async () => {
        const payload = await getSystemStatus('tenant_123', 'admin');

        expect(payload).toBeDefined();
        expect(payload.finops.state).toBe('unlocked');
        expect(payload.finops.percentUsed).toBe(50);

        expect(payload.infra).toBeDefined();
        expect(payload.knowledge).toBeDefined();
        expect(payload.ai).toBeDefined();
        expect(payload.whatsapp).toBeDefined();

        // Assert RBAC leak prevention assumption
        expect(payload.infra.storageReason).toBeDefined();
    });

    it('hides sensitive infra reasons from viewer role', async () => {
        const payload = await getSystemStatus('tenant_123', 'viewer');
        // Because of our implementation, `storageReason` is only attached if role is manager/owner/admin
        expect(payload.infra.storageReason).toBeUndefined();
    });

});
