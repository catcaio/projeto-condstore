import { NextRequest } from 'next/server';
import { GET } from './route';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rateLimiter } from '@/infra/security/rate-limiter';
import { publicEventsRepository } from '@/infra/repositories/public-events.repository';

vi.mock('@/infra/security/rate-limiter', () => ({
    applyRateLimitHeaders: vi.fn((res) => res),
    hashRateLimitKeyForLog: vi.fn(),
    rateLimiter: { limit: vi.fn() },
}));

vi.mock('@/infra/repositories/public-events.repository', () => ({
    publicEventsRepository: { create: vi.fn() },
}));

vi.mock('@/infra/repositories/attribution-click.repository', () => ({
    attributionClickRepository: { getByToken: vi.fn().mockResolvedValue(null), upsertByToken: vi.fn() },
}));

vi.mock('@/infra/log/logger');

const MOCK_INTENT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const mockDbSelect = vi.fn();
vi.mock('@/infra/db', () => ({
    getDb: vi.fn(async () => ({
        select: () => ({
            from: () => ({
                where: () => ({
                    limit: mockDbSelect,
                }),
            }),
        }),
    })),
}));

vi.mock('@/infra/redis.client', () => ({
    redisClient: {
        get: vi.fn().mockResolvedValue(null),
        setEx: vi.fn(),
    },
}));

function makeReq(intentId: string | null, anonId?: string) {
    const url = intentId
        ? `http://localhost/api/public/cotacao/quotes?intentId=${intentId}`
        : 'http://localhost/api/public/cotacao/quotes';
    const req = new NextRequest(url, { method: 'GET' });
    if (anonId) {
        req.cookies.set('condstore_anon', anonId);
    }
    return req;
}

describe('GET /api/public/cotacao/quotes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(rateLimiter.limit).mockResolvedValue({
            allowed: true, remaining: 29, resetAt: Date.now() + 1000, limit: 30,
        } as any);
    });

    it('returns 400 for missing intentId', async () => {
        const res = await GET(makeReq(null, 'anon-1'));
        expect(res.status).toBe(400);
    });

    it('returns 400 for invalid intentId format', async () => {
        const res = await GET(makeReq('not-a-uuid', 'anon-1'));
        expect(res.status).toBe(400);
    });

    it('returns 403 when no anonId cookie', async () => {
        const res = await GET(makeReq(MOCK_INTENT_ID));
        expect(res.status).toBe(403);
    });

    it('returns 200 with simulated quotes', async () => {
        mockDbSelect.mockResolvedValue([{
            id: MOCK_INTENT_ID,
            anonId: 'anon-1',
            eventType: 'quote_intent_created',
            attributionId: null,
            payloadJson: {
                originCep: '01310100',
                destinationCep: '80010000',
                weightInKg: 2,
                packageType: 'box',
            },
        }]);

        const res = await GET(makeReq(MOCK_INTENT_ID, 'anon-1'));
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.simulated).toBe(true);
        expect(body.quotes.length).toBeGreaterThanOrEqual(5);
        expect(body.bestPriceId).toBeDefined();
        expect(body.bestSpeedId).toBeDefined();

        // No PII
        for (const q of body.quotes) {
            expect(q.email).toBeUndefined();
            expect(q.nome).toBeUndefined();
            expect(q.telefone).toBeUndefined();
        }

        // Event logged
        expect(publicEventsRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'cotacao_quotes_generated',
                payloadJson: expect.objectContaining({ simulated: true }),
            }),
        );
    });

    it('returns 403 when anonId does not match intent', async () => {
        mockDbSelect.mockResolvedValue([{
            id: MOCK_INTENT_ID,
            anonId: 'another-anon',
            eventType: 'quote_intent_created',
            attributionId: null,
            payloadJson: { originCep: '01310100', destinationCep: '80010000', weightInKg: 2, packageType: 'box' },
        }]);

        const res = await GET(makeReq(MOCK_INTENT_ID, 'anon-1'));
        expect(res.status).toBe(403);
    });

    it('returns 429 when rate limited', async () => {
        vi.mocked(rateLimiter.limit).mockResolvedValue({
            allowed: false, remaining: 0, resetAt: Date.now() + 1000, limit: 30,
        } as any);

        const res = await GET(makeReq(MOCK_INTENT_ID, 'anon-1'));
        expect(res.status).toBe(429);
    });
});
