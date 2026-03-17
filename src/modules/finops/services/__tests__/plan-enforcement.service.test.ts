import { describe, it, expect, vi, beforeEach } from 'vitest';
import { planEnforcementService } from '../plan-enforcement.service';
import { tenantRepository } from '@/infra/repositories/tenant.repository';

// Note: Using vi.mock directly since planEnforcementService manages its own getDb call, 
// but we just mock getTenantUsage directly to test enforcePlanLimit logic easily
const mockGetTenantUsage = vi.spyOn(planEnforcementService, 'getTenantUsage');
const mockGetTenantById = vi.spyOn(tenantRepository, 'getTenantById');

describe('planEnforcementService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('enforcePlanLimit blocks correctly when locked', async () => {
        mockGetTenantById.mockResolvedValue({ id: 't1', plan: 'starter' } as any);
        mockGetTenantUsage.mockResolvedValue({
            freight_simulations_per_month: 200, // Limit is 50 for starter
            whatsapp_outbound_per_month: 0,
            inbox_conversations_per_month: 0
        });

        const res = await planEnforcementService.enforcePlanLimit('t1', 'freight_simulation');
        expect(res.allowed).toBe(false);
        expect(res.state).toBe('locked');
        expect(res.percentUsed).toBe(4);
    });

    it('enforcePlanLimit returns degraded_preemptive for > 0.8', async () => {
        mockGetTenantById.mockResolvedValue({ id: 't1', plan: 'starter' } as any);
        mockGetTenantUsage.mockResolvedValue({
            freight_simulations_per_month: 42, // Exactly 84% - preemptive
            whatsapp_outbound_per_month: 0,
            inbox_conversations_per_month: 0
        });

        const res = await planEnforcementService.enforcePlanLimit('t1', 'freight_simulation');
        expect(res.allowed).toBe(true);
        expect(res.state).toBe('degraded_preemptive');
        expect(res.percentUsed).toBe(0.84);
        expect(res.headers['x-finops-state']).toBe('degraded_preemptive');
    });

    it('enforcePlanLimit blocks exactly at limit (degraded)', async () => {
        mockGetTenantById.mockResolvedValue({ id: 't1', plan: 'starter' } as any);
        mockGetTenantUsage.mockResolvedValue({
            freight_simulations_per_month: 50, // Exactly 100%
            whatsapp_outbound_per_month: 0,
            inbox_conversations_per_month: 0
        });

        const res = await planEnforcementService.enforcePlanLimit('t1', 'freight_simulation');
        expect(res.allowed).toBe(false);
        expect(res.state).toBe('degraded');
        expect(res.percentUsed).toBe(1);
    });

    it('getPlanStatus returns expected summary', async () => {
        mockGetTenantById.mockResolvedValue({ id: 't1', plan: 'growth' } as any);
        mockGetTenantUsage.mockResolvedValue({
            freight_simulations_per_month: 500, // 10% of 5000
            whatsapp_outbound_per_month: 10000, // 100% of 10000 -> degraded (locked at 1.0)
            inbox_conversations_per_month: 0
        });

        const res = await planEnforcementService.getPlanStatus('t1');

        expect(res.plan).toBe('growth');
        expect(res.state).toBe('degraded'); // 100% used on whatsapp means degraded overall
        expect(res.percentFreight).toBe('10.0');
        expect(res.percentWhatsapp).toBe('100.0');
        expect(res.maxPercent).toBe('100.0');
    });
});
