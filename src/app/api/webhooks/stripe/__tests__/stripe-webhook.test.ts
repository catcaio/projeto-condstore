import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockPublishEvent = vi.fn();
vi.mock('../../../../../domine/event-bus', () => ({
    publishEvent: (...args: any[]) => mockPublishEvent(...args),
    eventBus: { waitForEvent: vi.fn() }
}));

const mockConstructEvent = vi.fn();
vi.mock('../../../../../core/stripe/stripe-client', () => ({
    getStripe: vi.fn(() => ({ webhooks: { constructEvent: mockConstructEvent } })),
    isStripeEnabled: vi.fn(() => true),
}));

vi.mock('../../../../../infra/db', () => ({
    getDb: vi.fn().mockImplementation(() => Promise.resolve({
        insert: () => ({ values: () => Promise.resolve() })
    })),
}));

vi.mock('../../../../../infra/log/logger', () => ({
    structuredLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../../../lib/infra/locks', () => ({
    withDistributedLock: vi.fn((key, ttl, cb) => cb())
}));

vi.mock('../../../../../infra/repositories/webhook-event.repository', () => ({
    webhookEventRepository: {
        tryInsert: vi.fn().mockResolvedValue(true),
        markProcessed: vi.fn(),
        markFailed: vi.fn(),
    }
}));

import { POST } from '../route';

function makeReq(body: unknown, sig: string | null = 'valid'): NextRequest {
    return {
        text: () => Promise.resolve(JSON.stringify(body)),
        headers: { get: (k: string) => k === 'stripe-signature' ? sig : null },
    } as unknown as NextRequest;
}

const CHECKOUT_EVENT = {
    id: 'evt_001',
    type: 'checkout.session.completed',
    created: Math.floor(Date.now() / 1000),
    data: { object: { id: 'cs_001' } },
};

describe('POST /api/webhook/stripe', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
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

    it('returns 200 and publishes event to domine bus', async () => {
        mockConstructEvent.mockReturnValue(CHECKOUT_EVENT);

        const res = await POST(makeReq(CHECKOUT_EVENT));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.received).toBe(true);

        expect(mockPublishEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'WEBHOOK_RECEIVED',
            source: 'stripe_webhook',
        }));
    });
});
