/**
 * Tests for POST /api/webhook/stripe
 * Located alongside the webhook route for proper module mocking.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Shared state ──────────────────────────────────────────────────────────────

let _insertCapture: any[] = [];
let _shouldDuplicate = false;

function makeMockDb() {
    return {
        insert: (_table: any) => ({
            values: (vals: any) => {
                _insertCapture.push({ ...vals });
                if (_shouldDuplicate) {
                    const err: any = new Error('Duplicate entry'); err.code = 'ER_DUP_ENTRY';
                    return { execute: () => Promise.reject(err) };
                }
                return { execute: () => Promise.resolve() };
            },
        }),
        update: (_table: any) => ({
            set: (_vals: any) => ({
                where: () => ({ execute: () => Promise.resolve() }),
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
const mockUpgrade = vi.fn().mockResolvedValue({ status: 'upgraded', plan: 'Pro', planId: 'plan_pro', newBudget: 500 });

vi.mock('../../../../../core/stripe/stripe-client', () => ({
    getStripe: vi.fn(() => ({ webhooks: { constructEvent: mockConstructEvent } })),
    isStripeEnabled: vi.fn(() => true),
    getPriceIdForPlan: vi.fn(() => 'price_pro'),
}));

vi.mock('../../../../../modules/billing/billing.service', () => ({
    upgradeTenantPlan: (...args: any[]) => mockUpgrade(...args),
    BillingServiceError: class BillingServiceError extends Error {
        code: string;
        constructor(code: string, msg: string) { super(msg); this.code = code; }
    },
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { POST } from '../route';
import { getDb } from '../../../../../infra/db';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(body: unknown, sig: string | null = 'valid'): NextRequest {
    return {
        text: () => Promise.resolve(JSON.stringify(body)),
        headers: { get: (k: string) => k === 'stripe-signature' ? sig : null },
    } as unknown as NextRequest;
}

const CHECKOUT_EVENT = {
    id: 'evt_001',
    type: 'checkout.session.completed',
    data: {
        object: {
            id: 'cs_001',
            customer: 'cus_abc',
            subscription: 'sub_xyz',
            metadata: { tenantId: 'tenant-1', planId: 'plan_pro' },
        },
    },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/webhook/stripe', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        _insertCapture = [];
        _shouldDuplicate = false;
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
        mockUpgrade.mockResolvedValue({ status: 'upgraded', planId: 'plan_pro', newBudget: 500 });
        vi.mocked(getDb).mockResolvedValue(makeMockDb() as any);
    });

    it('returns 400 when stripe-signature header is missing', async () => {
        mockConstructEvent.mockImplementation(() => { throw new Error('no sig'); });
        const res = await POST(makeReq(CHECKOUT_EVENT, null));
        expect(res.status).toBe(400);
    });

    it('returns 400 when signature is invalid', async () => {
        mockConstructEvent.mockImplementation(() => { throw new Error('invalid sig'); });
        const res = await POST(makeReq(CHECKOUT_EVENT, 'bad'));
        expect(res.status).toBe(400);
    });

    it('calls upgradeTenantPlan on checkout.session.completed', async () => {
        mockConstructEvent.mockReturnValue(CHECKOUT_EVENT);

        const res = await POST(makeReq(CHECKOUT_EVENT));
        expect(res.status).toBe(200);
        expect(mockUpgrade).toHaveBeenCalledWith('tenant-1', 'plan_pro', expect.stringContaining('stripe:'));
    });

    it('saves stripe_events record with correct id and type', async () => {
        mockConstructEvent.mockReturnValue(CHECKOUT_EVENT);

        await POST(makeReq(CHECKOUT_EVENT));
        const saved = _insertCapture.find((v) => v.id === 'evt_001');
        expect(saved).toBeDefined();
        expect(saved.type).toBe('checkout.session.completed');
    });

    it('returns 200 with received:true for valid event (idempotency key inserted)', async () => {
        mockConstructEvent.mockReturnValue(CHECKOUT_EVENT);

        const res = await POST(makeReq(CHECKOUT_EVENT));
        expect(res.status).toBe(200);
        const body = await res.json();
        // Either first-time processed or duplicate — both should be 200
        expect(body.received).toBe(true);
        // Also verify the stripe_events record was attempted to be inserted
        const evtInsert = _insertCapture.find((v: any) => v.id === 'evt_001');
        expect(evtInsert).toBeDefined();
    });

});
