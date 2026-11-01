import { describe, it, expect, beforeEach } from 'vitest';
import { frankExecutionStateService } from '@/modules/frank/frank-execution-state.service';
import { MessageRepository } from '@/infra/repositories/message.repository';
import { randomUUID } from 'crypto';

describe('Multi-Tenant Data Isolation Loop Test', () => {
    const tenantA = 'tenant_alpha_isolated_test';
    const tenantB = 'tenant_beta_isolated_test';
    const messageRepo = new MessageRepository();

    it('prevents cross-tenant state leakage in Frank operational runtime (memory fallback & contracts)', async () => {
        // Tenant A creates an execution run
        const runA = await frankExecutionStateService.createRun({
            tenantId: tenantA,
            title: 'Operação Privada Tenant A',
            autonomyLevel: 'OBSERVE',
        });

        // Tenant B creates an execution run
        const runB = await frankExecutionStateService.createRun({
            tenantId: tenantB,
            title: 'Operação Privada Tenant B',
            autonomyLevel: 'OBSERVE',
        });

        expect(runA.executionId).toBeDefined();
        expect(runB.executionId).toBeDefined();

        // 1. Tenant A fetches its own run
        const fetchedA = await frankExecutionStateService.getExecutionWithSteps(tenantA, runA.executionId);
        expect(fetchedA).not.toBeNull();
        expect(fetchedA?.run.tenantId).toBe(tenantA);

        // 2. Tenant B fetches its own run
        const fetchedB = await frankExecutionStateService.getExecutionWithSteps(tenantB, runB.executionId);
        expect(fetchedB).not.toBeNull();
        expect(fetchedB?.run.tenantId).toBe(tenantB);

        // 3. Cross-tenant leakage check: Tenant B cannot access Tenant A's execution
        const crossFetch = await frankExecutionStateService.getExecutionWithSteps(tenantB, runA.executionId);
        expect(crossFetch).toBeNull();

        // 4. Cross-tenant mutation check: Tenant A cannot mutate Tenant B's run
        await expect(
            frankExecutionStateService.updateRunStatusWithTenantCheck(tenantA, runB.id, 'COMPLETED')
        ).rejects.toThrow('Cross-tenant access denied');
    });

    it('validates tenant repository contract rejects queries missing tenant context', async () => {
        // Calling repository without tenant context must fail closed
        await expect(messageRepo.getMetricsToday('')).rejects.toThrow('tenant_id is required to get metrics');
        await expect(messageRepo.getLastMessages('', '+5511999999999', 5)).resolves.toEqual([]);
    });
});
