import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    mockGetTenantId,
    mockLoggerWarn,
    mockSelectWhere,
    mockUpdate,
} = vi.hoisted(() => ({
    mockGetTenantId: vi.fn(),
    mockLoggerWarn: vi.fn(),
    mockSelectWhere: vi.fn(),
    mockUpdate: vi.fn(() => ({
        set: vi.fn(() => ({
            where: vi.fn(),
        })),
    })),
}));

vi.mock('@/db/client', () => ({
    db: {
        select: vi.fn(() => ({
            from: vi.fn(() => ({
                where: mockSelectWhere,
            })),
        })),
        update: mockUpdate,
        insert: vi.fn(() => ({
            values: vi.fn(),
        })),
    },
}));

vi.mock('@/modules/audit/audit.actions', () => ({
    getTenantId: mockGetTenantId,
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

vi.mock('@/infra/logger', () => ({
    logger: {
        warn: mockLoggerWarn,
        info: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

import { approveAndExecuteFrankAction } from './review';

describe('approveAndExecuteFrankAction policy enforcement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetTenantId.mockResolvedValue('tenant-1');
        mockSelectWhere.mockResolvedValue([
            {
                id: 'action-1',
                tenantId: 'tenant-1',
                type: 'order_update_status',
                status: 'review_required',
                payload: {
                    orderId: 'order-1',
                    newStatus: 'producao',
                },
                explanation: {
                    what: 'Atualizar o status operacional do pedido',
                    why: 'Pedido pronto para seguir o fluxo',
                    impact: 'O pedido avança para produção',
                    risk: 'medium',
                    rollback: false,
                },
                entityType: 'order',
                entityId: 'order-1',
            },
        ]);
    });

    it('returns POLICY_BLOCKED before mutating data when risk is below the required level', async () => {
        const result = await approveAndExecuteFrankAction('action-1', {
            orderId: 'order-1',
            newStatus: 'producao',
        });

        expect(result).toEqual({
            success: false,
            error: 'Action "order_update_status" must be classified at least as high risk before execution.',
            code: 'POLICY_BLOCKED',
        });
        expect(mockUpdate).not.toHaveBeenCalled();
        expect(mockLoggerWarn).toHaveBeenCalledWith(
            'frank_action_policy_blocked',
            expect.objectContaining({
                tenantId: 'tenant-1',
                actionId: 'action-1',
                actionType: 'order_update_status',
                recordedRisk: 'medium',
                requiredRisk: 'high',
            }),
        );
    });
});
