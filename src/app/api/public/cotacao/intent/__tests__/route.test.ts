import { NextRequest } from 'next/server';
import { POST } from '../route';
import { sanitizeQuoteIntentPayload } from '@/modules/cotacao-publica/sanitization';
import { rateLimiter } from '@/infra/security/rate-limiter';
import { publicEventsRepository } from '@/infra/repositories/public-events.repository';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/infra/security/rate-limiter', () => ({
    applyRateLimitHeaders: vi.fn((res) => res),
    hashRateLimitKeyForLog: vi.fn(),
    rateLimiter: {
        limit: vi.fn(),
    }
}));

vi.mock('@/infra/repositories/public-events.repository', () => ({
    publicEventsRepository: {
        create: vi.fn(),
    }
}));
vi.mock('@/infra/repositories/attribution-click.repository', () => ({
    attributionClickRepository: {
        getByToken: vi.fn().mockResolvedValue(null),
        upsertByToken: vi.fn(),
    }
}));
vi.mock('@/infra/log/logger');

describe('Public Quote Intent Sanitization', () => {
    it('strips PII from payload', () => {
        const raw = {
            originCep: '12345-678',
            destinationCep: '87654321',
            weightInKg: '1.5',
            userEmail: 'hacker@test.com',
            userName: 'John Doe',
            utmSource: ' google ',
            clickId: '123'
        };

        const clean = sanitizeQuoteIntentPayload(raw);

        expect(clean).toEqual({
            originCep: '12345678',
            destinationCep: '87654321',
            weightInKg: 1.5,
            widthCm: undefined,
            heightCm: undefined,
            lengthCm: undefined,
            insuranceValue: undefined,
            packageType: 'box',
            utmSource: 'google',
            utmMedium: undefined,
            utmCampaign: undefined,
            utmTerm: undefined,
            utmContent: undefined,
            referrer: undefined,
            landingPath: undefined,
        });
        expect((clean as any).userEmail).toBeUndefined();
        expect((clean as any).userName).toBeUndefined();
    });
});

describe('POST /api/public/cotacao/intent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(rateLimiter.limit).mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 1000, limit: 10 } as any);
    });

    it('rejects invalid payload', async () => {
        const req = new NextRequest('http://localhost/api/public/cotacao/intent', {
            method: 'POST',
            body: JSON.stringify({ originCep: 'invalid' })
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it('accepts valid payload and logs intent', async () => {
        const ts = Date.now();
        const req = new NextRequest('http://localhost/api/public/cotacao/intent', {
            method: 'POST',
            body: JSON.stringify({
                originCep: '12345678',
                destinationCep: '87654321',
                weightInKg: 2,
                packageType: 'box',
                clientTs: ts,
                utmSource: 'test'
            })
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.intentId).toBeDefined();
        expect(body.next).toBe('upgrades_pending');

        expect(publicEventsRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'quote_intent_created',
                payloadJson: expect.objectContaining({ utmSource: 'test', weightInKg: 2 }),
            })
        );
    });

    it('enforces rate limits', async () => {
        vi.mocked(rateLimiter.limit).mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 1000, limit: 10 } as any);

        const req = new NextRequest('http://localhost/api/public/cotacao/intent', {
            method: 'POST',
            body: JSON.stringify({ originCep: '12345678' })
        });

        const res = await POST(req);
        expect(res.status).toBe(429);
    });
});

