import { describe, it, expect, beforeEach, vi } from 'vitest';
import { frankExecutionStateService } from '@/modules/frank/frank-execution-state.service';
import { MessageRepository } from '@/infra/repositories/message.repository';

const mockDbLimit = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockDbGroupBy = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockDbWhere = vi.hoisted(() => vi.fn().mockReturnValue({
    groupBy: mockDbGroupBy,
    limit: mockDbLimit,
    orderBy: vi.fn().mockReturnValue({ limit: mockDbLimit }),
}));

const mockDb = vi.hoisted(() => ({
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
    select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
            where: mockDbWhere,
            innerJoin: vi.fn().mockReturnValue({
                where: mockDbWhere,
            }),
        }),
    }),
}));

vi.mock('@/infra/db', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/infra/db')>();
    return {
        ...actual,
        getDb: vi.fn().mockResolvedValue(mockDb),
    };
});

vi.mock('@/db/client', () => ({
    db: mockDb,
}));

vi.mock('@/infra/pii/crypto', () => ({
    decryptString: vi.fn((val: string) => `decrypted_${val}`),
    encryptString: vi.fn((val: string) => `encrypted_${val}`),
}));

describe('Multi-Tenant Data Isolation Loop Test', () => {
    const tenantA = 'tenant_alpha_isolated_test';
    const tenantB = 'tenant_beta_isolated_test';
    const messageRepo = new MessageRepository();

    beforeEach(() => {
        vi.clearAllMocks();
    });

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

    it('ensures message metrics strictly scope counts to the calling tenantId', async () => {
        // Query metrics for Tenant A
        mockDbGroupBy.mockResolvedValueOnce([
            { intent: 'COTACAO', count: 5 },
            { intent: 'RASTREAMENTO', count: 2 },
        ]);

        const metricsA = await messageRepo.getMetricsToday(tenantA);
        expect(metricsA.total).toBe(7);
        expect(metricsA.breakdown['COTACAO']).toBe(5);
        expect(metricsA.breakdown['RASTREAMENTO']).toBe(2);

        // Query metrics for Tenant B (completely different data)
        mockDbGroupBy.mockResolvedValueOnce([
            { intent: 'DUVIDA', count: 1 },
        ]);

        const metricsB = await messageRepo.getMetricsToday(tenantB);
        expect(metricsB.total).toBe(1);
        expect(metricsB.breakdown['DUVIDA']).toBe(1);
        expect(metricsB.breakdown['COTACAO']).toBeUndefined();
    });
});
