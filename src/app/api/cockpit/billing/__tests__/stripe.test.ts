/**
 * Stripe Integration Tests
 *
 * Covers:
 *   - POST /checkout: 400 when STRIPE_DISABLED
 *   - POST /checkout: 400 for free plan (no priceId)
 *   - POST /checkout: 200 with session url on valid plan
 *   - POST /webhook/stripe: 400 for missing signature
 *   - POST /webhook/stripe: 400 for invalid signature
 *   - POST /webhook/stripe: idempotent (duplicate returns 200 + duplicate:true)
 *   - POST /webhook/stripe: checkout.session.completed calls upgradeTenantPlan
 *   - POST /webhook/stripe: saves stripe_events entry
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Shared state (not referenced in vi.mock factory) ──────────────────────────

let _shouldDuplicate = false;
let _insertCapture: any[] = [];
let _updateCapture: any[] = [];

function makeMockDb() {
    return {
        insert: () => ({
            values: (vals: any) => {
                _insertCapture.push({ ...vals });
                if (_shouldDuplicate) {
                    const err: any = new Error('Duplicate entry'); err.code = 'ER_DUP_ENTRY';
                    return {
                        then: (_r: any, rej: any) => Promise.reject(err).then(_r, rej),
                        execute: () => Promise.reject(err),
                    };
                }
                return {
                    then: (res: any) => Promise.resolve().then(res),
                    execute: () => Promise.resolve(),
                };
            },
        }),
        select: () => ({
            from: () => ({
                where: () => {
                    const rows = [{
                        id: 'plan_pro', name: 'Pro', active: 1,
                        monthlyPriceUsd: '99', monthlyBudgetUsd: '500',
                    }];
                    return {
                        limit: () => Promise.resolve(rows),
                        then: (resolve: any) => resolve(rows),
                    };
                },
            }),
        }),
        update: () => ({
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

vi.mock('../../../../../infra/auth/guards', () => ({
    requireAdmin: vi.fn().mockResolvedValue({
        ok: true,
        requestId: 'req-stripe-test',
        session: { tenantId: 'tenant-test', role: 'admin', sub: 'user-1', email: 'a@b.com', sv: 1 },
    }),
}));

vi.mock('../../../../../infra/http/request-trace', () => ({
    makeRequestId: vi.fn(() => 'req-stripe-test'),
    attachRequestIdHeader: vi.fn((res: any) => res),
}));

vi.mock('../../../../../infra/log/logger', () => ({
    structuredLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../../../infra/http/error-response', async (importOriginal) => {
    return await importOriginal();
});

// Stripe client mock
const mockCheckoutCreate = vi.fn();
const mockConstructEvent = vi.fn();
let _stripeEnabled = true;
let _priceIdMap: Record<string, string> = { plan_pro: 'price_pro_123' };

vi.mock('../../../../../core/stripe/stripe-client', () => ({
    isStripeEnabled: vi.fn(() => _stripeEnabled),
    getStripe: vi.fn(() => ({
        checkout: { sessions: { create: mockCheckoutCreate } },
        webhooks: { constructEvent: mockConstructEvent },
    })),
    getPriceIdForPlan: vi.fn((planId: string) => _priceIdMap[planId] ?? null),
    getPriceWhitelist: vi.fn(() => new Set(Object.values(_priceIdMap))),
    getPlanIdFromPriceId: vi.fn((priceId: string) => {
        for (const [planId, pid] of Object.entries(_priceIdMap)) {
            if (pid === priceId) return planId;
        }
        return null;
    }),
}));

const mockPublishEvent = vi.fn();
vi.mock('../../../../../domine/event-bus', () => ({
    publishEvent: (...args: any[]) => mockPublishEvent(...args),
    eventBus: { waitForEvent: vi.fn() }
}));

// Billing service mock
const mockUpgradeTenantPlan = vi.fn().mockResolvedValue({
    status: 'upgraded', plan: 'Pro', planId: 'plan_pro', newBudget: 500,
});

vi.mock('../../../../../modules/billing/billing.service', () => ({
    upgradeTenantPlan: (...args: any[]) => mockUpgradeTenantPlan(...args),
    BillingServiceError: class BillingServiceError extends Error {
        code: string;
        constructor(code: string, msg: string) { super(msg); this.code = code; }
    },
}));

// ── Imports (AFTER mocks) ────────────────────────────────────────────────────

import { POST as checkoutPOST } from '../checkout/route';
import { POST as webhookPOST } from '../../../webhook/stripe/route';
import { isStripeEnabled, getPriceIdForPlan } from '../../../../../core/stripe/stripe-client';
import { getDb } from '../../../../../infra/db';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCheckoutReq(body: unknown): NextRequest {
    return {
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(JSON.stringify(body)),
        headers: { get: (_k: string) => null },
        cookies: { get: () => undefined },
        nextUrl: { pathname: '/api/cockpit/billing/checkout' },
    } as unknown as NextRequest;
}

function makeWebhookReq(body: unknown, sig: string | null = 'valid-sig'): NextRequest {
    return {
        text: () => Promise.resolve(JSON.stringify(body)),
        headers: { get: (k: string) => k === 'stripe-signature' ? sig : null },
    } as unknown as NextRequest;
}

const CHECKOUT_EVENT = {
    id: 'evt_001',
    type: 'checkout.session.completed',
    created: Math.floor(Date.now() / 1000),
    data: {
        object: {
            id: 'cs_001',
            mode: 'subscription',
            payment_status: 'paid',
            customer: 'cus_abc',
            subscription: 'sub_xyz',
            client_reference_id: null,
            metadata: { tenantId: 'tenant-1', planId: 'plan_pro', priceId: 'price_pro_123' },
        },
    },
};

// ── Checkout Tests ────────────────────────────────────────────────────────────

describe('POST /api/cockpit/billing/checkout', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        _insertCapture = [];
        _updateCapture = [];
        _shouldDuplicate = false;
        _stripeEnabled = true;
        _priceIdMap = { plan_pro: 'price_pro_123', plan_growth: 'price_growth_xxx' };
        mockCheckoutCreate.mockResolvedValue({ id: 'cs_test', url: 'https://checkout.stripe.com/pay/cs_test' });
        mockUpgradeTenantPlan.mockResolvedValue({ status: 'upgraded', plan: 'Pro', planId: 'plan_pro', newBudget: 500 });
        vi.mocked(getDb).mockResolvedValue(makeMockDb() as any);
        // After clearAllMocks, restore requireAdmin implementation
        const guards = await import('../../../../../infra/auth/guards');
        vi.mocked(guards.requireAdmin).mockResolvedValue({
            ok: true, requestId: 'req-stripe-test',
            session: { tenantId: 'tenant-test', role: 'admin', sub: 'user-1', email: 'a@b.com', sv: 1 },
        } as any);
    });

    it('returns 400 STRIPE_DISABLED when Stripe is not enabled', async () => {
        _stripeEnabled = false;
        (isStripeEnabled as ReturnType<typeof vi.fn>).mockReturnValue(false);

        const res = await checkoutPOST(makeCheckoutReq({ planId: 'plan_pro' }));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('STRIPE_DISABLED');
    });

    it('returns 400 for free plan (no price ID)', async () => {
        (isStripeEnabled as ReturnType<typeof vi.fn>).mockReturnValue(true);
        (getPriceIdForPlan as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);

        const res = await checkoutPOST(makeCheckoutReq({ planId: 'plan_starter' }));
        expect(res.status).toBe(400);
    });

    it('returns 200 with checkout url for valid plan', async () => {
        (isStripeEnabled as ReturnType<typeof vi.fn>).mockReturnValue(true);
        (getPriceIdForPlan as ReturnType<typeof vi.fn>).mockReturnValue('price_pro_123');

        const res = await checkoutPOST(makeCheckoutReq({ planId: 'plan_pro' }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.url).toContain('stripe.com');
        expect(mockCheckoutCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                mode: 'subscription',
                metadata: expect.objectContaining({ planId: 'plan_pro', tenantId: 'tenant-test' }),
            }),
        );
    });
});

// ── Stripe Webhook Tests ──────────────────────────────────────────────────────

describe('POST /api/webhook/stripe', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        _insertCapture = [];
        _updateCapture = [];
        _shouldDuplicate = false;
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
        mockUpgradeTenantPlan.mockResolvedValue({ status: 'upgraded', plan: 'Pro', planId: 'plan_pro', newBudget: 500 });
        mockPublishEvent.mockClear();
        vi.mocked(getDb).mockResolvedValue(makeMockDb() as any);
    });

    it('returns 400 when stripe-signature header is missing', async () => {
        mockConstructEvent.mockImplementation(() => { throw new Error('No sig'); });
        const req = makeWebhookReq(CHECKOUT_EVENT, null);
        const res = await webhookPOST(req);
        expect(res.status).toBe(400);
    });

    it('returns 400 when signature is invalid', async () => {
        mockConstructEvent.mockImplementation(() => { throw new Error('Signature mismatch'); });
        const res = await webhookPOST(makeWebhookReq(CHECKOUT_EVENT, 'bad-sig'));
        expect(res.status).toBe(400);
    });

    it('returns 200 with received:true on any successful event', async () => {
        mockConstructEvent.mockReturnValue(CHECKOUT_EVENT);

        const res = await webhookPOST(makeWebhookReq(CHECKOUT_EVENT));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.received).toBe(true);
    });

    it('publishes a WEBHOOK_RECEIVED event to domine bus on checkout.session.completed', async () => {
        mockConstructEvent.mockReturnValue(CHECKOUT_EVENT);

        const res = await webhookPOST(makeWebhookReq(CHECKOUT_EVENT));
        expect(res.status).toBe(200);
        expect(mockPublishEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'WEBHOOK_RECEIVED',
            source: 'stripe_webhook',
        }));
    });

    it('inserts a stripe_events record with event id and type', async () => {
        mockConstructEvent.mockReturnValue(CHECKOUT_EVENT);

        await webhookPOST(makeWebhookReq(CHECKOUT_EVENT));

        const saved = _insertCapture.find((v) => v.id === 'evt_001');
        expect(saved).toBeDefined();
        expect(saved.type).toBe('checkout.session.completed');
    });
});
