/**
 * reconcile-stripe.test.ts
 *
 * Testes do endpoint POST /api/internal/billing/reconcile-stripe
 * e do helper reconcileSubscriptionFromStripe.
 *
 * Cenários:
 *   1) local active + stripe past_due => update -> past_due
 *   2) local past_due + stripe active => update -> active
 *   3) local endedAt != null + stripe active => NO-OP (não reativa)
 *   4) stripe canceled => local canceled + endedAt set
 *   5) dryRun => não persiste, mas retorna patches
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── State ─────────────────────────────────────────────────────────────────────

let _mockDbRows: any[] = [];
const _updateCapture: any[] = [];
let _mockStripeSubResponse: any = {};

// ── Mock DB ───────────────────────────────────────────────────────────────────

function makeMockDb() {
    return {
        select: () => ({
            from: () => ({
                where: () => ({
                    limit: () => Promise.resolve(_mockDbRows),
                    then: (resolve: any) => resolve(_mockDbRows),
                }),
            }),
        }),
        update: (_t: any) => ({
            set: (vals: any) => ({
                where: () => {
                    _updateCapture.push({ ...vals });
                    return {
                        then: (res: any) => Promise.resolve().then(res),
                        execute: () => Promise.resolve(),
                    };
                },
            }),
        }),
    };
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../../../../infra/db', () => ({
    getDb: vi.fn().mockImplementation(() => Promise.resolve(makeMockDb())),
}));

vi.mock('../../../../../infra/log/logger', () => ({
    structuredLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../../../infra/http/request-trace', () => ({
    makeRequestId: vi.fn(() => 'req-reconcile-test'),
    attachRequestIdHeader: vi.fn((res: any) => res),
}));

vi.mock('../../../../../infra/config/internal-token', () => ({
    isInternalTokenAuthorized: vi.fn((token: string) => token === 'valid-token'),
    getInternalExportTokenOrThrow: vi.fn(() => 'valid-token'),
}));

vi.mock('../../../../../core/stripe/stripe-client', () => ({
    getStripe: vi.fn(() => ({
        subscriptions: {
            retrieve: vi.fn(() => Promise.resolve(_mockStripeSubResponse)),
        },
    })),
    isStripeEnabled: vi.fn(() => true),
}));

vi.mock('../../../../../modules/billing/reconcile-stripe', async (importOriginal) => {
    return await importOriginal();
});

vi.mock('../../../../../lib/security/replay-protection', () => ({
    validateReplayProtection: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('../../../../../infra/redis.client', () => ({
    redisClient: { setNx: vi.fn().mockResolvedValue(true) },
}));
// ── Import ────────────────────────────────────────────────────────────────────

import { POST } from '../reconcile-stripe/route';
import { getDb } from '../../../../../infra/db';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(body: object, token = 'valid-token'): NextRequest {
    return {
        json: () => Promise.resolve(body),
        headers: { get: (k: string) => k === 'x-internal-token' ? token : null },
    } as unknown as NextRequest;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/internal/billing/reconcile-stripe', () => {
    beforeEach(() => {
        _mockDbRows = [];
        _updateCapture.length = 0;
        _mockStripeSubResponse = {};
        vi.mocked(getDb).mockImplementation(() => Promise.resolve(makeMockDb() as any));
    });

    it('returns 401 without valid x-internal-token', async () => {
        const res = await POST(makeReq({}, 'invalid'));
        expect(res.status).toBe(401);
    });

    it('1) local active + stripe past_due => update to past_due', async () => {
        _mockDbRows = [{
            id: 'sub-1', tenantId: 'tenant-1', status: 'active',
            stripeSubscriptionId: 'sub_stripe_1', endedAt: null,
            cancelAtPeriodEnd: false, currentPeriodEnd: null,
        }];
        _mockStripeSubResponse = {
            id: 'sub_stripe_1', status: 'past_due',
            cancel_at_period_end: false, current_period_end: null,
        };

        const res = await POST(makeReq({}));
        const body = await res.json();

        expect(body.processedCount).toBe(1);
        expect(body.updatedCount).toBe(1);
        expect(body.items[0].before).toBe('active');
        expect(body.items[0].after).toBe('past_due');
        expect(_updateCapture.length).toBe(1);
        expect(_updateCapture[0].status).toBe('past_due');
    });

    it('2) local past_due + stripe active => update to active', async () => {
        _mockDbRows = [{
            id: 'sub-2', tenantId: 'tenant-2', status: 'past_due',
            stripeSubscriptionId: 'sub_stripe_2', endedAt: null,
            cancelAtPeriodEnd: false, currentPeriodEnd: null,
        }];
        _mockStripeSubResponse = {
            id: 'sub_stripe_2', status: 'active',
            cancel_at_period_end: false, current_period_end: null,
        };

        const res = await POST(makeReq({}));
        const body = await res.json();

        expect(body.updatedCount).toBe(1);
        expect(body.items[0].after).toBe('active');
        expect(_updateCapture[0].status).toBe('active');
    });

    it('3) local endedAt != null + stripe active => NO-OP (não reativa)', async () => {
        _mockDbRows = [{
            id: 'sub-3', tenantId: 'tenant-3', status: 'canceled',
            stripeSubscriptionId: 'sub_stripe_3', endedAt: new Date('2024-01-01'),
            cancelAtPeriodEnd: false, currentPeriodEnd: null,
        }];
        _mockStripeSubResponse = {
            id: 'sub_stripe_3', status: 'active',
            cancel_at_period_end: false, current_period_end: null,
        };

        const res = await POST(makeReq({}));
        const body = await res.json();

        expect(body.updatedCount).toBe(0);
        expect(body.driftCount).toBe(1);
        expect(body.items[0].action).toBe('drift_local_ended_stripe_active');
        expect(_updateCapture.length).toBe(0);
    });

    it('4) stripe canceled => local canceled + endedAt set', async () => {
        _mockDbRows = [{
            id: 'sub-4', tenantId: 'tenant-4', status: 'active',
            stripeSubscriptionId: 'sub_stripe_4', endedAt: null,
            cancelAtPeriodEnd: false, currentPeriodEnd: null,
        }];
        _mockStripeSubResponse = {
            id: 'sub_stripe_4', status: 'canceled',
            cancel_at_period_end: false, current_period_end: null,
        };

        const res = await POST(makeReq({}));
        const body = await res.json();

        expect(body.updatedCount).toBe(1);
        expect(body.items[0].after).toBe('canceled');
        expect(_updateCapture[0].status).toBe('canceled');
        expect(_updateCapture[0].endedAt).toBeInstanceOf(Date);
    });

    it('5) dryRun => não persiste, mas retorna patches', async () => {
        _mockDbRows = [{
            id: 'sub-5', tenantId: 'tenant-5', status: 'active',
            stripeSubscriptionId: 'sub_stripe_5', endedAt: null,
            cancelAtPeriodEnd: false, currentPeriodEnd: null,
        }];
        _mockStripeSubResponse = {
            id: 'sub_stripe_5', status: 'past_due',
            cancel_at_period_end: true, current_period_end: Math.floor(Date.now() / 1000) + 86400,
        };

        const res = await POST(makeReq({ dryRun: true }));
        const body = await res.json();

        expect(body.dryRun).toBe(true);
        expect(body.updatedCount).toBe(1);
        expect(body.items[0].action).toContain('dry_run');
        // NO updates should have been persisted
        expect(_updateCapture.length).toBe(0);
    });
});
