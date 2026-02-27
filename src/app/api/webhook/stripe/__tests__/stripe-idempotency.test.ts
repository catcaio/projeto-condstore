/**
 * stripe-idempotency.test.ts
 *
 * REGRA CENTRAL TESTADA:
 *   Se o mesmo stripe_event_id chegar duas vezes ao webhook,
 *   upgradeTenantPlan() deve ser chamado EXATAMENTE UMA VEZ,
 *   e a 2ª resposta deve conter { received:true, duplicate:true }.
 *
 * Estratégia de mock:
 *   - Usamos vi.fn() para simular o insert de stripe_events.
 *   - Na 1ª chamada: insert retorna sucesso.
 *   - Na 2ª chamada: insert rejeita com ER_DUP_ENTRY (simula UNIQUE constraint).
 *   - upgradeTenantPlan() só é chamado se inserted=true.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mock state ────────────────────────────────────────────────────────────────

// Simula UNIQUE(stripe_event_id) do banco: cada event_id só pode ser inserido 1x
const _insertedEventIds = new Set<string>();
const _insertCapture: any[] = [];

// ── Mock factory ──────────────────────────────────────────────────────────────

function makeMockInsert() {
    return (_table: any) => ({
        values: (vals: any) => {
            _insertCapture.push({ ...vals });

            const eventId: string = vals.stripeEventId ?? vals.id;

            if (_insertedEventIds.has(eventId)) {
                // UNIQUE violation — simula ER_DUP_ENTRY do MySQL
                const err: any = new Error(
                    `Duplicate entry '${eventId}' for key 'uq_stripe_events_event_id'`
                );
                err.code = 'ER_DUP_ENTRY';
                // Return Thenable that rejects (Drizzle uses `await` on the builder)
                return {
                    execute: () => Promise.reject(err),
                    then: (resolve: any, reject: any) => Promise.reject(err).then(resolve, reject),
                };
            }

            // Success: register the event ID in the Set
            _insertedEventIds.add(eventId);
            return {
                execute: () => Promise.resolve(),
                then: (resolve: any) => Promise.resolve().then(resolve),
            };
        },
    });
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../../../../infra/db', () => ({
    getDb: vi.fn().mockImplementation(() =>
        Promise.resolve({
            insert: makeMockInsert(),
            update: (_t: any) => ({
                set: (_v: any) => ({
                    where: () => ({ execute: () => Promise.resolve() }),
                }),
            }),
            select: () => ({
                from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
            }),
        })
    ),
}));

vi.mock('../../../../../infra/log/logger', () => ({
    structuredLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockConstructEvent = vi.fn();
const mockUpgrade = vi.fn();

vi.mock('../../../../../core/stripe/stripe-client', () => ({
    getStripe: vi.fn(() => ({
        webhooks: { constructEvent: mockConstructEvent },
    })),
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

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { POST } from '../route';
import { getDb } from '../../../../../infra/db';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const STRIPE_EVENT_ID = 'evt_idempotency_001';

const CHECKOUT_EVENT = {
    id: STRIPE_EVENT_ID,
    type: 'checkout.session.completed',
    created: Math.floor(Date.now() / 1000),
    data: {
        object: {
            id: 'cs_001',
            customer: 'cus_abc',
            subscription: 'sub_xyz',
            metadata: { tenantId: 'tenant-1', planId: 'plan_pro' },
        },
    },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(event: object, sig = 'valid-sig'): NextRequest {
    return {
        text: () => Promise.resolve(JSON.stringify(event)),
        headers: { get: (k: string) => k === 'stripe-signature' ? sig : null },
    } as unknown as NextRequest;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Stripe Webhook — DB Idempotency', () => {
    beforeEach(() => {
        _insertedEventIds.clear();
        _insertCapture.length = 0;

        // Clear call history (not implementations)
        mockConstructEvent.mockClear();
        mockUpgrade.mockClear();

        mockConstructEvent.mockReturnValue(CHECKOUT_EVENT);
        mockUpgrade.mockResolvedValue({
            status: 'upgraded', plan: 'Pro', planId: 'plan_pro', newBudget: 500,
        });
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

        // Reinstall getDb mock with fresh insert counter
        vi.mocked(getDb).mockImplementation(() =>
            Promise.resolve({
                insert: makeMockInsert(),
                update: (_t: any) => ({
                    set: (_v: any) => ({
                        where: () => ({ execute: () => Promise.resolve() }),
                    }),
                }),
                select: () => ({
                    from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
                }),
            } as any)
        );
    });

    // ── CORE ─────────────────────────────────────────────────────────────────────

    it('CORE: upgradeTenantPlan chamado EXATAMENTE 1 vez quando o mesmo evento chega 2 vezes', async () => {
        // 1ª entrega do evento
        const res1 = await POST(makeReq(CHECKOUT_EVENT));
        expect(res1.status).toBe(200);
        const body1 = await res1.json();
        expect(body1.received).toBe(true);
        expect(body1.duplicate).toBeUndefined();

        // 2ª entrega com o MESMO stripe_event_id
        const res2 = await POST(makeReq(CHECKOUT_EVENT));
        expect(res2.status).toBe(200);
        const body2 = await res2.json();
        expect(body2.duplicate).toBe(true);

        // upgradeTenantPlan deve ter sido chamado APENAS 1 vez
        expect(mockUpgrade).toHaveBeenCalledTimes(1);
        expect(mockUpgrade).toHaveBeenCalledWith(
            'tenant-1',
            'plan_pro',
            expect.stringContaining('stripe:'),
        );
    });

    it('CORE: INSERT de stripe_events tentado 2 vezes, mas apenas 1 aceito (UNIQUE gate)', async () => {
        await POST(makeReq(CHECKOUT_EVENT));
        await POST(makeReq(CHECKOUT_EVENT));

        // Devem ter ocorrido 2 tentativas de insert
        expect(_insertCapture.length).toBe(2);
        // Ambas com o mesmo stripe_event_id
        expect(_insertCapture[0].stripeEventId ?? _insertCapture[0].id).toBe(STRIPE_EVENT_ID);
        expect(_insertCapture[1].stripeEventId ?? _insertCapture[1].id).toBe(STRIPE_EVENT_ID);
    });

    // ── GATES ────────────────────────────────────────────────────────────────────

    it('GATE: 1ª entrega retorna 200 received:true (não é duplicado)', async () => {
        const res = await POST(makeReq(CHECKOUT_EVENT));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.received).toBe(true);
        expect(body.duplicate).toBeUndefined();
    });

    it('GATE: 2ª entrega retorna 200 duplicate:true', async () => {
        await POST(makeReq(CHECKOUT_EVENT)); // 1ª
        const res = await POST(makeReq(CHECKOUT_EVENT)); // 2ª
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.duplicate).toBe(true);
    });

    it('GATE: 2 eventos DIFERENTES → upgradeTenantPlan chamado 2 vezes', async () => {
        const eventA = { ...CHECKOUT_EVENT, id: 'evt_A' };
        const eventB = { ...CHECKOUT_EVENT, id: 'evt_B' };

        mockConstructEvent
            .mockReturnValueOnce(eventA)
            .mockReturnValueOnce(eventB);

        await POST(makeReq(eventA));
        await POST(makeReq(eventB));

        // Cada evento é único → upgradeTenantPlan chamado 2 vezes
        expect(mockUpgrade).toHaveBeenCalledTimes(2);
    });

    // ── AUDIT ─────────────────────────────────────────────────────────────────────

    it('AUDIT: insertStripeEventOnce salva payloadHash e stripeCreatedAt', async () => {
        await POST(makeReq(CHECKOUT_EVENT));

        const first = _insertCapture[0];
        expect(first).toBeDefined();
        expect(typeof first.payloadHash).toBe('string');
        expect(first.payloadHash.length).toBeGreaterThan(0);
        expect(first.stripeCreatedAt).toBeInstanceOf(Date);
    });

    it('AUDIT: stripe_event_id salvo igual ao event.id do Stripe', async () => {
        await POST(makeReq(CHECKOUT_EVENT));

        const first = _insertCapture[0];
        const savedId = first.stripeEventId ?? first.id;
        expect(savedId).toBe(STRIPE_EVENT_ID);
    });
});
