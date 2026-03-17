/**
 * stripe-lifecycle.test.ts
 *
 * Testa os gates e as resoluções de lifecycle do evento Stripe:
 *
 * - invoice.payment_failed:
 *   1) sub ativa => altera status para past_due.
 *   2) sub já cancelada => ignora e não altera status.
 *
 * - customer.subscription.updated:
 *   3) status='past_due' (Stripe) => status='past_due'
 *   4) status='active' (Stripe) => status='active'
 *   5) cancel_at_period_end=true => permanece no status original (ex: active) e persiste flag.
 *   6) tenant com status canceled => nunca reativa (ignored).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Shared DB state ───────────────────────────────────────────────────────────

const _insertedEventIds = new Set<string>();
const _insertCapture: any[] = [];
let _mockSubRow: any | null = null;
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
                    then: (resolve: any) => resolve(_mockSubRow ? [_mockSubRow] : []),
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

vi.mock('../../../../../core/stripe/stripe-client', () => ({
    getStripe: vi.fn(() => ({ webhooks: { constructEvent: mockConstructEvent } })),
    isStripeEnabled: vi.fn(() => true),
}));

vi.mock('@/modules/billing/services/billing.service', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/modules/billing/services/billing.service')>();
    return {
        ...actual,
        upgradeTenantPlan: vi.fn(),
    };
});

// ── Imports ───────────────────────────────────────────────────────────────────

import { processStripeEvent } from '@/modules/billing/services/stripe-webhook.service';
import { getDb } from '../../../../../infra/db';
import type Stripe from 'stripe';

// ── Helpers ───────────────────────────────────────────────────────────────────

let _eventCounter = 100;

function makeReq(event: object): NextRequest {
    return {
        text: () => Promise.resolve(JSON.stringify(event)),
        headers: { get: (k: string) => k === 'stripe-signature' ? 'valid-sig' : null },
    } as unknown as NextRequest;
}

function makePaymentFailedEvent(subId: string): any {
    _eventCounter++;
    return {
        id: `evt_payment_failed_${_eventCounter}`,
        type: 'invoice.payment_failed',
        created: Math.floor(Date.now() / 1000),
        data: {
            object: {
                id: 'in_failed_001',
                subscription: subId,
            },
        },
    };
}

function makeSubUpdatedEvent(subId: string, stripeStatus: string, changes: any = {}): any {
    _eventCounter++;
    return {
        id: `evt_sub_updated_${_eventCounter}`,
        type: 'customer.subscription.updated',
        created: Math.floor(Date.now() / 1000),
        data: {
            object: {
                id: subId,
                status: stripeStatus,
                cancel_at_period_end: false,
                current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30, // +30 dias
                ...changes,
            },
        },
    };
}

// ── Tests: invoice.payment_failed ─────────────────────────────────────────────

describe('Lifecycle: invoice.payment_failed', () => {
    beforeEach(() => {
        _insertedEventIds.clear();
        _insertCapture.length = 0;
        _updateCapture.length = 0;
        _mockSubRow = null;
        mockConstructEvent.mockClear();
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
        vi.mocked(getDb).mockImplementation(() => Promise.resolve(makeMockDb() as any));
    });

    it('1) subscription ativa => muda status para past_due', async () => {
        _mockSubRow = {
            id: 'sub-row-1',
            tenantId: 'tenant-1',
            stripeSubscriptionId: 'sub_live_active',
            status: 'active',
            endedAt: null,
        };
        const event = makePaymentFailedEvent('sub_live_active');
        mockConstructEvent.mockReturnValue(event);

        const res = await processStripeEvent(event as Stripe.Event);
        expect(res.processed).toBe(true);
        expect(res.ignored).toBe(false);

        const update = _updateCapture[0];
        expect(update).toBeDefined();
        expect(update.status).toBe('past_due');
        expect(update.lastPaymentFailedAt).toBeInstanceOf(Date);
    });

    it('2) subscription cancels / endedAt != null => NÃO altera', async () => {
        _mockSubRow = {
            id: 'sub-row-2',
            tenantId: 'tenant-2',
            stripeSubscriptionId: 'sub_live_canceled',
            status: 'canceled',
            endedAt: new Date(),
        };
        const event = makePaymentFailedEvent('sub_live_canceled');
        mockConstructEvent.mockReturnValue(event);

        const res = await processStripeEvent(event as Stripe.Event);
        expect(res.ignored).toBe(true);
        expect(res.reason).toBe('already_canceled');
        expect(_updateCapture.length).toBe(0);
    });
});

// ── Tests: customer.subscription.updated ──────────────────────────────────────

describe('Lifecycle: customer.subscription.updated', () => {
    beforeEach(() => {
        _insertedEventIds.clear();
        _insertCapture.length = 0;
        _updateCapture.length = 0;
        _mockSubRow = null;
        mockConstructEvent.mockClear();
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
        vi.mocked(getDb).mockImplementation(() => Promise.resolve(makeMockDb() as any));
    });

    it('3) status="past_due" => define "past_due" localmente', async () => {
        _mockSubRow = {
            id: 'sub-3', stripeSubscriptionId: 'sub_upd_1', status: 'active', endedAt: null,
        };
        const event = makeSubUpdatedEvent('sub_upd_1', 'past_due');
        mockConstructEvent.mockReturnValue(event);

        const res = await processStripeEvent(event as Stripe.Event);
        expect(res.processed).toBe(true);

        const update = _updateCapture[0];
        expect(update.status).toBe('past_due');
        expect(update.cancelAtPeriodEnd).toBe(false);
    });

    it('4) status="active" => define "active" localmente (se era past_due, resolve)', async () => {
        _mockSubRow = {
            id: 'sub-4', stripeSubscriptionId: 'sub_upd_2', status: 'past_due', endedAt: null,
        };
        const event = makeSubUpdatedEvent('sub_upd_2', 'active');
        mockConstructEvent.mockReturnValue(event);

        await processStripeEvent(event as Stripe.Event);
        expect(_updateCapture[0].status).toBe('active');
    });

    it('5) cancel_at_period_end=true => NÃO altera para canceled, apenas flag', async () => {
        _mockSubRow = {
            id: 'sub-5', stripeSubscriptionId: 'sub_upd_3', status: 'active', endedAt: null,
        };
        const event = makeSubUpdatedEvent('sub_upd_3', 'active', { cancel_at_period_end: true });
        mockConstructEvent.mockReturnValue(event);

        await processStripeEvent(event as Stripe.Event);
        const update = _updateCapture[0];
        expect(update.status).toBe('active'); // status main não muda pra canceled
        expect(update.cancelAtPeriodEnd).toBe(true);
        expect(update.currentPeriodEnd).toBeInstanceOf(Date);
    });

    it('6) subscription cancelada (ended) => NÃO reacende', async () => {
        _mockSubRow = {
            id: 'sub-6', stripeSubscriptionId: 'sub_upd_4', status: 'canceled', endedAt: new Date(),
        };
        const event = makeSubUpdatedEvent('sub_upd_4', 'active');
        mockConstructEvent.mockReturnValue(event);

        const res = await processStripeEvent(event as Stripe.Event);
        expect(res.ignored).toBe(true);
        expect(res.reason).toBe('already_canceled');
        expect(_updateCapture.length).toBe(0);
    });
});
