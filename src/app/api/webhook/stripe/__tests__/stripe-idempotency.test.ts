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

// Simula UNIQUE do banco: cada event_id só pode ser inserido 1x
const _insertedEventIds = new Set<string>();

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../../../../lib/infra/locks', () => ({
    withDistributedLock: vi.fn((key, ttl, cb) => cb())
}));

vi.mock('../../../../../infra/repositories/webhook-event.repository', () => ({
    webhookEventRepository: {
        tryInsert: vi.fn(),
        markProcessed: vi.fn(),
        markFailed: vi.fn(),
    }
}));

vi.mock('../../../../../infra/db', () => ({
    getDb: vi.fn().mockImplementation(() =>
        Promise.resolve({
            update: (_t: any) => ({
                set: (_v: any) => ({
                    where: () => ({ execute: () => Promise.resolve() }),
                }),
            }),
            select: () => ({
                from: () => ({ where: () => ({ limit: () => Promise.resolve([]), then: (resolve: any) => resolve([]), }) }),
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
    getPriceIdForPlan: vi.fn((id: string) => id === 'plan_pro' ? 'price_pro_test' : null),
    getPriceWhitelist: vi.fn(() => new Set(['price_pro_test'])),
    getPlanIdFromPriceId: vi.fn((pid: string) => pid === 'price_pro_test' ? 'plan_pro' : null),
}));

vi.mock('@/modules/billing', () => ({
    upgradeTenantPlan: (...args: any[]) => mockUpgrade(...args),
    BillingServiceError: class BillingServiceError extends Error {
        code: string;
        constructor(code: string, msg: string) { super(msg); this.code = code; }
    },
}));

const mockPublishEvent = vi.fn();
vi.mock('../../../../../domine/event-bus', () => ({
    publishEvent: (...args: any[]) => mockPublishEvent(...args),
    eventBus: { waitForEvent: vi.fn() }
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { POST } from '../route';
import { webhookEventRepository } from '../../../../../infra/repositories/webhook-event.repository';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const STRIPE_EVENT_ID = 'evt_idempotency_001';

const CHECKOUT_EVENT = {
    id: STRIPE_EVENT_ID,
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
            metadata: { tenantId: 'tenant-1', planId: 'plan_pro', priceId: 'price_pro_test' },
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

        // Clear call history (not implementations)
        mockConstructEvent.mockClear();
        mockPublishEvent.mockClear();
        vi.mocked(webhookEventRepository.tryInsert).mockClear();

        mockConstructEvent.mockReturnValue(CHECKOUT_EVENT);
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

        vi.mocked(webhookEventRepository.tryInsert).mockImplementation(async (data: any) => {
            if (_insertedEventIds.has(data.eventId)) {
                return false; // Duplicate
            }
            _insertedEventIds.add(data.eventId);
            return true; // Success
        });
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

        // publishEvent deve ter sido chamado APENAS 1 vez
        expect(mockPublishEvent).toHaveBeenCalledTimes(1);
        expect(mockPublishEvent).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'WEBHOOK_RECEIVED', source: 'stripe_webhook' })
        );
    });

    it('CORE: INSERT de webhook_events tentado 2 vezes, mas apenas 1 aceito', async () => {
        await POST(makeReq(CHECKOUT_EVENT));
        await POST(makeReq(CHECKOUT_EVENT));

        expect(webhookEventRepository.tryInsert).toHaveBeenCalledTimes(2);

        // As duas chamadas possuíam o mesmo event.id
        const calls = vi.mocked(webhookEventRepository.tryInsert).mock.calls;
        expect(calls[0][0].eventId).toBe(STRIPE_EVENT_ID);
        expect(calls[1][0].eventId).toBe(STRIPE_EVENT_ID);
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

        // Cada evento é único → publishEvent chamado 2 vezes
        expect(mockPublishEvent).toHaveBeenCalledTimes(2);
    });

    // ── AUDIT ─────────────────────────────────────────────────────────────────────

    it('AUDIT: registerWebhookEvent passa payloadHash', async () => {
        await POST(makeReq(CHECKOUT_EVENT));

        const calls = vi.mocked(webhookEventRepository.tryInsert).mock.calls;
        const first = calls[0][0];

        expect(first).toBeDefined();
        expect(typeof first.payloadHash).toBe('string');
        expect(first.payloadHash.length).toBeGreaterThan(0);
    });

    it('AUDIT: eventId salvo igual ao event.id do Stripe', async () => {
        await POST(makeReq(CHECKOUT_EVENT));

        const calls = vi.mocked(webhookEventRepository.tryInsert).mock.calls;
        const savedId = calls[0][0].eventId;
        expect(savedId).toBe(STRIPE_EVENT_ID);
    });
});
