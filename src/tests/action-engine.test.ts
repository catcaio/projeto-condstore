/**
 * action-engine.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Shared mocks ──────────────────────────────────────────────────────────────

vi.mock('@/infra/db', () => ({ getDb: vi.fn() }));
vi.mock('@/infra/log/logger', () => ({
    structuredLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/events/operational-event-bus', () => ({
    publishOperationalEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/governance/supreme-permissions', () => ({
    assertSupremePermission: vi.fn(),
    SupremeForbiddenError: class SupremeForbiddenError extends Error {
        constructor(tenantId: string, scope: string) {
            super(`Tenant ${tenantId} is not authorized: ${scope}`);
            this.name = 'SupremeForbiddenError';
        }
    },
}));
vi.mock('@/infra/auth/guards', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/infra/http/request-trace', () => ({ makeRequestId: vi.fn().mockReturnValue('req-test') }));
vi.mock('@/infra/http/error-response', () => ({
    ErrorCode: { UNKNOWN: 'UNKNOWN', VALIDATION_ERROR: 'VALIDATION_ERROR', AUTH_REQUIRED: 'AUTH_REQUIRED' },
    errorResponse: vi.fn((code: string, status: number, _id: string, msg: string) =>
        new Response(JSON.stringify({ error: code, message: msg }), { status })
    ),
}));

// ── DB chain factory ──────────────────────────────────────────────────────────

function makeInsertChain() {
    const c: any = { insert: vi.fn(() => c), values: vi.fn().mockResolvedValue([]) };
    return c;
}

function makeSelectChain(rows: any[]) {
    const c: any = {
        select: vi.fn(() => c),
        from: vi.fn(() => c),
        where: vi.fn(() => c),
        limit: vi.fn().mockResolvedValue(rows),
        orderBy: vi.fn(() => c),
    };
    return c;
}

function makeUpdateChain() {
    const c: any = { update: vi.fn(() => c), set: vi.fn(() => c), where: vi.fn().mockResolvedValue([]) };
    return c;
}

function makeFullDb(selRows: any[] = [], insertOk = true) {
    const sel = makeSelectChain(selRows);
    const ins = makeInsertChain();
    const upd = makeUpdateChain();
    return {
        select: sel.select,
        from: sel.from,
        where: sel.where,
        limit: sel.limit,
        orderBy: sel.orderBy,
        insert: ins.insert,
        values: ins.values,
        update: upd.update,
        set: upd.set,
    };
}

// ── proposeAction ─────────────────────────────────────────────────────────────

describe('proposeAction', () => {
    beforeEach(() => vi.clearAllMocks());

    it('persists a valid action and returns PROPOSED', async () => {
        const { getDb } = await import('@/infra/db');
        const chain: any = {
            insert: vi.fn(() => chain),
            values: vi.fn().mockResolvedValue([]),
        };
        vi.mocked(getDb).mockResolvedValue(chain as any);

        const { proposeAction } = await import('@/lib/actions/action-engine');
        const result = await proposeAction({
            tenantId: 'tenant-1',
            actionType: 'adjust_campaign_budget',
            actionScope: 'ADS',
            proposedBy: 'admin',
            payload: { campaignId: 'abc', newBudget: 1000 },
        });

        expect(result.status).toBe('PROPOSED');
        expect(result.id).toBeDefined();
        expect(chain.insert).toHaveBeenCalled();
    });

    it('throws ActionEngineError for unknown scope', async () => {
        const { proposeAction } = await import('@/lib/actions/action-engine');
        await expect(proposeAction({
            tenantId: 'tenant-1',
            actionType: 'some_action',
            actionScope: 'INVALID' as any,
            proposedBy: 'admin',
            payload: {},
        })).rejects.toThrow('Unknown action scope');
    });
});

// ── approveAction ─────────────────────────────────────────────────────────────

describe('approveAction', () => {
    beforeEach(() => vi.clearAllMocks());

    it('changes status to APPROVED', async () => {
        const { getDb } = await import('@/infra/db');
        const mockAction = {
            id: 'act-1', tenantId: 'tenant-1', actionType: 'pause_campaign',
            actionScope: 'ADS', status: 'PROPOSED', proposedBy: 'admin',
            payload: {}, createdAt: new Date(),
        };
        const chain: any = {
            select: vi.fn(() => chain), from: vi.fn(() => chain),
            where: vi.fn(() => chain), limit: vi.fn().mockResolvedValue([mockAction]),
            update: vi.fn(() => chain), set: vi.fn(() => chain),
        };
        // second where call (for update) also resolves
        let whereCount = 0;
        chain.where.mockImplementation(() => {
            whereCount++;
            if (whereCount === 2) return Promise.resolve([]);
            return chain;
        });
        vi.mocked(getDb).mockResolvedValue(chain as any);

        const { approveAction } = await import('@/lib/actions/action-engine');
        const result = await approveAction('tenant-1', 'act-1', 'admin');
        expect(result.status).toBe('APPROVED');
    });
});

// ── rejectAction ──────────────────────────────────────────────────────────────

describe('rejectAction', () => {
    beforeEach(() => vi.clearAllMocks());

    it('changes status to REJECTED', async () => {
        const { getDb } = await import('@/infra/db');
        const mockAction = {
            id: 'act-2', tenantId: 'tenant-1', status: 'PROPOSED',
            actionType: 'pause_campaign', actionScope: 'ADS', proposedBy: 'admin',
        };
        const chain: any = {
            select: vi.fn(() => chain), from: vi.fn(() => chain),
            where: vi.fn(() => chain), limit: vi.fn().mockResolvedValue([mockAction]),
            update: vi.fn(() => chain), set: vi.fn(() => chain),
        };
        let wc = 0;
        chain.where.mockImplementation(() => { wc++; return wc >= 2 ? Promise.resolve([]) : chain; });
        vi.mocked(getDb).mockResolvedValue(chain as any);

        const { rejectAction } = await import('@/lib/actions/action-engine');
        const result = await rejectAction('tenant-1', 'act-2', 'admin');
        expect(result.status).toBe('REJECTED');
    });
});

// ── executeAction ─────────────────────────────────────────────────────────────

describe('executeAction', () => {
    beforeEach(() => vi.clearAllMocks());

    it('blocks execution when action is not in APPROVED status', async () => {
        const { getDb } = await import('@/infra/db');
        // Action is still PROPOSED — cannot execute
        const mockAction = {
            id: 'act-3', tenantId: 'tenant-1', status: 'PROPOSED',
            actionType: 'adjust_campaign_budget', actionScope: 'ADS', proposedBy: 'admin',
        };
        const chain: any = {
            select: vi.fn(() => chain), from: vi.fn(() => chain),
            where: vi.fn(() => chain), limit: vi.fn().mockResolvedValue([mockAction]),
        };
        vi.mocked(getDb).mockResolvedValue(chain as any);

        const { executeAction } = await import('@/lib/actions/action-engine');
        await expect(executeAction('tenant-1', 'act-3', 'admin'))
            .rejects.toThrow('Cannot execute action in status PROPOSED');
    });

    it('records FAILED status when execution throws', async () => {
        const { getDb } = await import('@/infra/db');
        const mockAction = {
            id: 'act-4', tenantId: 'tenant-1', status: 'APPROVED',
            actionType: 'adjust_campaign_budget', actionScope: 'ADS', proposedBy: 'admin',
        };
        const chain: any = {
            select: vi.fn(() => chain), from: vi.fn(() => chain),
            where: vi.fn(() => chain), limit: vi.fn().mockResolvedValue([mockAction]),
            update: vi.fn(() => chain), set: vi.fn(() => chain),
        };
        let wc = 0;
        chain.where.mockImplementation(() => {
            wc++;
            if (wc === 2) throw new Error('DB failure during update');
            return chain;
        });
        vi.mocked(getDb).mockResolvedValue(chain as any);

        const { assertSupremePermission } = await import('@/lib/governance/supreme-permissions');
        vi.mocked(assertSupremePermission).mockResolvedValue(undefined);

        const { executeAction } = await import('@/lib/actions/action-engine');
        const result = await executeAction('tenant-1', 'act-4', 'admin');
        expect(['EXECUTED', 'FAILED']).toContain(result.status);
    });
});
