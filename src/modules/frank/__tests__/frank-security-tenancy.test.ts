import { describe, it, expect } from 'vitest';
import { frankExecutionStateService } from '../frank-execution-state.service';

describe('Frank Multi-Tenancy & Cross-Tenant Security Guardrails', () => {
    const tenantA = 'tenant_alpha_123';
    const tenantB = 'tenant_beta_456';

    it('should prevent Tenant B from retrieving or updating Tenant A execution runs', async () => {
        // 1. Tenant A creates an execution run
        const runA = await frankExecutionStateService.createRun({
            tenantId: tenantA,
            title: 'Execução confidencial do Tenant Alpha',
            autonomyLevel: 'OBSERVE',
        });

        expect(runA).toBeDefined();

        // 2. Tenant B attempts to fetch Tenant A execution run -> MUST BE NULL / DENIED
        const crossTenantResult = await frankExecutionStateService.getExecutionWithSteps(tenantB, runA.executionId);
        expect(crossTenantResult).toBeNull();

        // 3. Tenant B attempts to update run status of Tenant A -> MUST NOT leak or update
        await expect(
            frankExecutionStateService.updateRunStatusWithTenantCheck(tenantB, runA.id, 'COMPLETED')
        ).rejects.toThrow('Cross-tenant access denied');
    });
});
