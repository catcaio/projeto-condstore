/**
 * stripe-gates.test.ts
 *
 * Testa os gates de negócio do webhook Stripe:
 *
 *   A. checkout.session.completed:
 *     1) payment_status != "paid" → ignored, upgradeTenantPlan NÃO chamado
 *     2) priceId desconhecido (não na whitelist) → ignored
 *     3) tenantId ausente → ignored
 *     4) mode != "subscription" → ignored
 *     5) todos os gates passam → upgradeTenantPlan chamado
 *
 *   B. invoice.paid:
 *     6) endedAt != null (já cancelado) → NÃO reativa
 *     7) status = "canceled" → NÃO reativa
 *     8) subscription ID mismatch → ignored
 *     9) sem matching subscription → ignored
 *
 *   C. customer.subscription.deleted:
 *     10) já cancelado → idempotente (no-op, not called again)
 *     11) sem matching subscription → ignored
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Shared DB state ───────────────────────────────────────────────────────────

// In-memory representation of stripe_events (UNIQUE) and tenant_subscriptions
const _insertedEventIds = new Set<string>();
const _insertCapture: any[] = [];

// Configurable: what the tenantSubscriptions SELECT returns
let _mockSubRow: any | null = null;
// Configurable: what updates are captured
const _updateCapture: any[] = [];

function makeMockDb() {
    return {
        insert: (_table: any) => ({
            values: (vals: any) => {
                _insertCapture.push({ ...vals });
                const eventId = vals.stripeEventId ?? vals.id;
                if (_insertedEventIds.has(eventId)) {
                    const err: any = new Error(`Duplicate entry '${eventId}'`);
                    err.code = 'ER_DUP_ENTRY';
                    return {
                        then: (_r: any, rej: any) => Promise.reject(err).then(_r, rej),
                        execute: () => Promise.reject(err),
                    };
                }
                _insertedEventIds.add(eventId);
                return {
                    then: (res: any) => Promise.resolve().then(res),
                    execute: () => Promise.resolve(),
                };
            },
        }),
        select: () => ({
            from: () => ({
                where: () => ({
                    limit: () => Promise.resolve(_mockSubRow ? [_mockSubRow] : []),
                }),
            }),
        }),
        update: (_table: any) => ({
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

const mockConstructEvent = vi.fn();
const mockUpgrade = vi.fn();

vi.mock('../../../../../core/stripe/stripe-client', () => ({
    getStripe: vi.fn(() => ({ webhooks: { constructEvent: mockConstructEvent } })),
    isStripeEnabled: vi.fn(() => true),
    getPriceIdForPlan: vi.fn((planId: string) => {
        const m: Record<string, string> = { plan_pro: 'price_pro_test', plan_growth: 'price_growth_test' };
        return m[planId] ?? null;
    }),
    getPriceWhitelist: vi.fn(() => new Set(['price_pro_test', 'price_growth_test'])),
    getPlanIdFromPriceId: vi.fn((priceId: string) => {
        const m: Record<string, string> = { price_pro_test: 'plan_pro', price_growth_test: 'plan_growth' };
        return m[priceId] ?? null;
    }),
}));

vi.mock('../../../../../modules/billing/billing.service', () => ({
    upgradeTenantPlan: (...args: any[]) => mockUpgrade(...args),
    BillingServiceError: class BillingServiceError extends Error {
        code: string;
        constructor(code: string, msg: string) { super(msg); this.code = code; }
    },
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { POST } from '../route';
import { getDb } from '../../../../../infra/db';

// ── Helpers ───────────────────────────────────────────────────────────────────

let _eventCounter = 0;

function makeReq(event: object): NextRequest {
    return {
        text: () => Promise.resolve(JSON.stringify(event)),
        headers: { get: (k: string) => k === 'stripe-signature' ? 'valid-sig' : null },
    } as unknown as NextRequest;
}

function makeCheckoutEvent(overrides: Record<string, any> = {}, id?: string): any {
    _eventCounter++;
    return {
        id: id ?? `evt_checkout_${_eventCounter}`,
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
                metadata: {
                    tenantId: 'tenant-1',
                    planId: 'plan_pro',
                    priceId: 'price_pro_test',
                },
                ...overrides,
            },
        },
    };
}

function makeInvoiceEvent(subId: string, overrides: Record<string, any> = {}, id?: string): any {
    _eventCounter++;
    return {
        id: id ?? `evt_invoice_${_eventCounter}`,
        type: 'invoice.paid',
        created: Math.floor(Date.now() / 1000),
        data: {
            object: {
                id: 'in_001',
                subscription: subId,
                ...overrides,
            },
        },
    };
}

function makeSubDeletedEvent(subId: string, id?: string): any {
    _eventCounter++;
    return {
        id: id ?? `evt_subdel_${_eventCounter}`,
        type: 'customer.subscription.deleted',
        created: Math.floor(Date.now() / 1000),
        data: { object: { id: subId } },
    };
}

// ── Tests: A. checkout.session.completed gates ────────────────────────────────

describe('A. checkout.session.completed — gates', () => {
    beforeEach(() => {
        _insertedEventIds.clear();
        _insertCapture.length = 0;
        _updateCapture.length = 0;
        _mockSubRow = null;
        mockConstructEvent.mockClear();
        mockUpgrade.mockClear();
        mockUpgrade.mockResolvedValue({ status: 'upgraded', planId: 'plan_pro', newBudget: 500 });
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
        vi.mocked(getDb).mockImplementation(() => Promise.resolve(makeMockDb() as any));
    });

    it('A1: payment_status != "paid" → ignored:true, upgradeTenantPlan NÃO chamado', async () => {
        const event = makeCheckoutEvent({ payment_status: 'unpaid' });
        mockConstructEvent.mockReturnValue(event);

        const res = await POST(makeReq(event));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ignored).toBe(true);
        expect(body.reason).toBe('payment_not_paid');
        expect(mockUpgrade).not.toHaveBeenCalled();
    });

    it('A2: priceId não na whitelist → ignored:true, upgradeTenantPlan NÃO chamado', async () => {
        const event = makeCheckoutEvent({
            metadata: { tenantId: 'tenant-1', planId: 'plan_pro', priceId: 'price_unknown_xxx' },
        });
        mockConstructEvent.mockReturnValue(event);

        const res = await POST(makeReq(event));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ignored).toBe(true);
        expect(body.reason).toBe('unknown_price');
        expect(mockUpgrade).not.toHaveBeenCalled();
    });

    it('A3: tenantId ausente → ignored:true com reason="missing_tenant_binding"', async () => {
        const event = makeCheckoutEvent({
            metadata: { planId: 'plan_pro', priceId: 'price_pro_test' },
            client_reference_id: null,
        });
        mockConstructEvent.mockReturnValue(event);

        const res = await POST(makeReq(event));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ignored).toBe(true);
        expect(body.reason).toBe('missing_tenant_binding');
        expect(mockUpgrade).not.toHaveBeenCalled();
    });

    it('A4: mode != "subscription" → ignored com reason="mode_not_subscription"', async () => {
        const event = makeCheckoutEvent({ mode: 'payment' });
        mockConstructEvent.mockReturnValue(event);

        const res = await POST(makeReq(event));
        const body = await res.json();
        expect(body.ignored).toBe(true);
        expect(body.reason).toBe('mode_not_subscription');
        expect(mockUpgrade).not.toHaveBeenCalled();
    });

    it('A5: todos os gates passam → upgradeTenantPlan chamado, received:true', async () => {
        const event = makeCheckoutEvent();
        mockConstructEvent.mockReturnValue(event);

        const res = await POST(makeReq(event));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.received).toBe(true);
        expect(body.ignored).toBeUndefined();
        expect(mockUpgrade).toHaveBeenCalledWith('tenant-1', 'plan_pro', expect.stringContaining('stripe:'));
    });
});

// ── Tests: B. invoice.paid gates ──────────────────────────────────────────────

describe('B. invoice.paid — gates', () => {
    beforeEach(() => {
        _insertedEventIds.clear();
        _insertCapture.length = 0;
        _updateCapture.length = 0;
        _mockSubRow = null;
        mockConstructEvent.mockClear();
        mockUpgrade.mockClear();
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
        vi.mocked(getDb).mockImplementation(() => Promise.resolve(makeMockDb() as any));
    });

    it('B1: endedAt != null (já cancelado) → NÃO reativa, ignored:true reason="already_canceled"', async () => {
        _mockSubRow = {
            id: 'sub-row-1',
            tenantId: 'tenant-1',
            stripeSubscriptionId: 'sub_canceled',
            status: 'active',           // status=active mas endedAt preenchido
            endedAt: new Date('2024-01-01'),
        };
        const event = makeInvoiceEvent('sub_canceled');
        mockConstructEvent.mockReturnValue(event);

        const res = await POST(makeReq(event));
        const body = await res.json();
        expect(body.ignored).toBe(true);
        expect(body.reason).toBe('already_canceled');
        // Nenhum update de status deve ter sido feito
        expect(_updateCapture.some((v) => v.status === 'active')).toBe(false);
    });

    it('B2: status = "canceled" → NÃO reativa, ignored:true reason="already_canceled"', async () => {
        _mockSubRow = {
            id: 'sub-row-2',
            tenantId: 'tenant-1',
            stripeSubscriptionId: 'sub_was_canceled',
            status: 'canceled',
            endedAt: new Date('2024-01-01'),
        };
        const event = makeInvoiceEvent('sub_was_canceled');
        mockConstructEvent.mockReturnValue(event);

        const res = await POST(makeReq(event));
        const body = await res.json();
        expect(body.ignored).toBe(true);
        expect(body.reason).toBe('already_canceled');
    });

    it('B3: sem matching subscription → ignored reason="no_matching_subscription"', async () => {
        _mockSubRow = null; // DB retorna []
        const event = makeInvoiceEvent('sub_not_found');
        mockConstructEvent.mockReturnValue(event);

        const res = await POST(makeReq(event));
        const body = await res.json();
        expect(body.ignored).toBe(true);
        expect(body.reason).toBe('no_matching_subscription');
    });

    it('B4: subscription ativa (past_due) → reativa normalmente', async () => {
        _mockSubRow = {
            id: 'sub-row-3',
            tenantId: 'tenant-1',
            stripeSubscriptionId: 'sub_past_due',
            status: 'past_due',
            endedAt: null,
        };
        const event = makeInvoiceEvent('sub_past_due');
        mockConstructEvent.mockReturnValue(event);

        const res = await POST(makeReq(event));
        const body = await res.json();
        expect(body.received).toBe(true);
        expect(body.ignored).toBeUndefined();
    });
});

// ── Tests: C. customer.subscription.deleted gates ─────────────────────────────

describe('C. customer.subscription.deleted — gates', () => {
    beforeEach(() => {
        _insertedEventIds.clear();
        _insertCapture.length = 0;
        _updateCapture.length = 0;
        _mockSubRow = null;
        mockConstructEvent.mockClear();
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
        vi.mocked(getDb).mockImplementation(() => Promise.resolve(makeMockDb() as any));
    });

    it('C1: já cancelado → idempotente, ignored:true reason="already_canceled"', async () => {
        _mockSubRow = {
            id: 'sub-row-4',
            tenantId: 'tenant-1',
            stripeSubscriptionId: 'sub_already_canceled',
            status: 'canceled',
            endedAt: new Date(),
        };
        const event = makeSubDeletedEvent('sub_already_canceled');
        mockConstructEvent.mockReturnValue(event);

        const res = await POST(makeReq(event));
        const body = await res.json();
        expect(body.ignored).toBe(true);
        expect(body.reason).toBe('already_canceled');
        // Nenhum update deve ter sido feito (já cancelado)
        expect(_updateCapture.some((v) => v.status === 'canceled')).toBe(false);
    });

    it('C2: sem matching subscription → ignored reason="no_matching_subscription"', async () => {
        _mockSubRow = null;
        const event = makeSubDeletedEvent('sub_ghost');
        mockConstructEvent.mockReturnValue(event);

        const res = await POST(makeReq(event));
        const body = await res.json();
        expect(body.ignored).toBe(true);
        expect(body.reason).toBe('no_matching_subscription');
    });

    it('C3: ativo → cancela (status=canceled, endedAt set)', async () => {
        _mockSubRow = {
            id: 'sub-row-5',
            tenantId: 'tenant-1',
            stripeSubscriptionId: 'sub_active_to_cancel',
            status: 'active',
            endedAt: null,
        };
        const event = makeSubDeletedEvent('sub_active_to_cancel');
        mockConstructEvent.mockReturnValue(event);

        const res = await POST(makeReq(event));
        const body = await res.json();
        expect(body.received).toBe(true);
        expect(body.ignored).toBeUndefined();
        const cancelUpdate = _updateCapture.find((v) => v.status === 'canceled');
        expect(cancelUpdate).toBeDefined();
        expect(cancelUpdate.endedAt).toBeInstanceOf(Date);
    });
});
