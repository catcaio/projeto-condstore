/**
 * playbook-engine.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Shared mocks ──────────────────────────────────────────────────────────────

vi.mock('@/infra/db', () => ({ getDb: vi.fn() }));
vi.mock('@/infra/log/logger', () => ({
    structuredLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/events/operational-event-bus', () => ({
    publishOperationalEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/actions/action-engine', () => ({
    proposeAction: vi.fn().mockResolvedValue({ id: 'action-mock-123' }),
}));

// Mock mappings
vi.mock('@/lib/actions/action-types', () => ({
    ACTION_TYPE_TO_SCOPE: {
        'adjust_checkout_incentive': 'PRICING',
        'trigger_followup_sequence': 'WHATSAPP'
    },
    ActionScope: {}
}));

function makeSelectChain(rows: any[]) { return { select: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue(rows), orderBy: vi.fn().mockReturnThis() }; }
function makeUpdateChain() { return { update: vi.fn().mockReturnThis(), set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue([]) }; }

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Playbook Engine', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    describe('evaluatePlaybooks', () => {
        it('returns empty when no findings passed', async () => {
            const { evaluatePlaybooks } = await import('@/lib/supreme/playbook-engine');
            const res = await evaluatePlaybooks('tenant-1', []);
            expect(res.playbooksMatched).toBe(0);
        });

        it('triggers executePlaybook for matching active playbooks', async () => {
            const { getDb } = await import('@/infra/db');

            const mockedPlaybooks = [
                { id: 'pb-1', triggerFindingType: 'checkout_dropoff_high', isActive: true, actionSequence: [{ action: 'adjust_checkout_incentive', delay_minutes: 0 }] }
            ];

            const sel = makeSelectChain(mockedPlaybooks);
            const upd = makeUpdateChain();
            vi.mocked(getDb).mockResolvedValue({
                select: sel.select,
                from: sel.from,
                where: sel.where,
                limit: sel.limit,
                update: upd.update,
                set: upd.set
            } as any);

            // Execute playbook requires another DB call to get findings inside the same flow, we mock that via finding mock
            // Since `executePlaybook` will hit `getDb().select()` again, we will spy on the internal behavior. 
            // Because mocking multiple selects accurately without a fake DB adapter is brittle in vitest, 
            // let's just make sure `proposeAction` is called which is the ultimate side-effect of `executePlaybook`.

            const { proposeAction } = await import('@/lib/actions/action-engine');
            const { evaluatePlaybooks } = await import('@/lib/supreme/playbook-engine');

            // The second call is to fetch the finding
            sel.limit.mockResolvedValueOnce(mockedPlaybooks)
                .mockResolvedValueOnce(mockedPlaybooks) // playbook lookup in executePlaybook
                .mockResolvedValueOnce([{ id: 'fnd-1', findingType: 'checkout_dropoff_high' }]); // finding lookup in executePlaybook

            // Also ensure that the original where() chained call returns the array, since evaluatePlaybooks doesn't call limit() on active playbooks
            sel.where.mockResolvedValueOnce(mockedPlaybooks);

            const findings = [{ id: 'fnd-1', findingType: 'checkout_dropoff_high' } as any];
            const res = await evaluatePlaybooks('tenant-1', findings);

            expect(res.playbooksMatched).toBe(1);

            // Verification that executePlaybook did its job:
            expect(proposeAction).toHaveBeenCalledWith(expect.objectContaining({
                tenantId: 'tenant-1',
                actionType: 'adjust_checkout_incentive',
                payload: expect.objectContaining({ _sourceFindingId: 'fnd-1', _executionDelayMinutes: 0 })
            }));
            expect(upd.set).toHaveBeenCalledWith({ status: 'ACTION_PROPOSED' });
        });
    });

    describe('executePlaybook', () => {
        it('creates multiple action proposals for sequences and updates status', async () => {
            const { getDb } = await import('@/infra/db');
            const { proposeAction } = await import('@/lib/actions/action-engine');

            const pbRow = {
                id: 'pb-2',
                isActive: true,
                actionSequence: [
                    { action: 'trigger_followup_sequence', delay_minutes: 0 },
                    { action: 'adjust_checkout_incentive', delay_minutes: 120 }
                ]
            };
            const findRow = { id: 'fnd-99', status: 'OPEN' };

            const sel = makeSelectChain([]);
            sel.limit.mockResolvedValueOnce([pbRow]).mockResolvedValueOnce([findRow]);
            const upd = makeUpdateChain();

            vi.mocked(getDb).mockResolvedValue({ select: sel.select, from: sel.from, where: sel.where, limit: sel.limit, update: upd.update, set: upd.set } as any);

            const { executePlaybook } = await import('@/lib/supreme/playbook-engine');
            const res = await executePlaybook('pb-2', 'tenant-1', 'fnd-99');

            expect(proposeAction).toHaveBeenCalledTimes(2);

            // Assert the first call in the sequence
            const firstCallArg = vi.mocked(proposeAction).mock.calls[0][0];
            expect(firstCallArg.actionType).toBe('trigger_followup_sequence');
            expect(firstCallArg.payload).toHaveProperty('_executionDelayMinutes', 0);

            // Assert the second call in the sequence
            const secondCallArg = vi.mocked(proposeAction).mock.calls[1][0];
            expect(secondCallArg.actionType).toBe('adjust_checkout_incentive');
            expect(secondCallArg.payload).toHaveProperty('_executionDelayMinutes', 120);

            expect(res.actionIds).toHaveLength(2);
            expect(res.findingStatus).toBe('ACTION_PROPOSED');
        });

        it('throws if playbook is disabled', async () => {
            const { getDb } = await import('@/infra/db');
            const sel = makeSelectChain([{ id: 'pb-3', isActive: false }]);
            vi.mocked(getDb).mockResolvedValue({ select: sel.select, from: sel.from, where: sel.where, limit: sel.limit } as any);

            const { executePlaybook } = await import('@/lib/supreme/playbook-engine');
            await expect(executePlaybook('pb-3', 'tenant-1', 'fnd-1')).rejects.toThrow('is disabled');
        });
    });
});
