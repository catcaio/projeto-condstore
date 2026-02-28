import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { rateLimiter } from '../../../../../infra/security/rate-limiter';
import { redisClient } from '../../../../../infra/redis.client';
import { analyticsService } from '../../../../../modules/analytics/analytics.service';

vi.mock('../../../../../infra/security/rate-limiter', () => ({
    rateLimiter: {
        limit: vi.fn(),
    },
    hashRateLimitKeyForLog: vi.fn(),
    applyRateLimitHeaders: vi.fn((res) => res),
}));

vi.mock('../../../../../infra/redis.client', () => ({
    redisClient: {
        setNx: vi.fn(),
    }
}));

vi.mock('../../../../../modules/analytics/analytics.service', () => ({
    analyticsService: {
        logEvent: vi.fn(),
    }
}));

describe('POST /api/public/events', () => {
    it('deve retornar 400 se o schema falhar (Falta type)', async () => {
        vi.mocked(rateLimiter.limit).mockResolvedValue({ allowed: true, remaining: 10, resetAt: Date.now() + 60000, limit: 60 } as any);

        const req = new NextRequest('http://localhost/api/public/events', {
            method: 'POST',
            body: JSON.stringify({ page: 'home', section: 'hero', ts: Date.now() })
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it('deve deduplicar req no bucket', async () => {
        vi.mocked(rateLimiter.limit).mockResolvedValue({ allowed: true, remaining: 10, resetAt: Date.now() + 60000, limit: 60 } as any);
        vi.mocked(redisClient.setNx).mockResolvedValue(false); // Já existe

        const req = new NextRequest('http://localhost/api/public/events', {
            method: 'POST',
            body: JSON.stringify({ type: 'view_section', page: 'home', section: 'hero', ts: Date.now() })
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true, dedup: true });
    });

    it('deve aceitar evento full pass', async () => {
        vi.mocked(rateLimiter.limit).mockResolvedValue({ allowed: true, remaining: 10, resetAt: Date.now() + 60000, limit: 60 } as any);
        vi.mocked(redisClient.setNx).mockResolvedValue(true); // first time
        vi.mocked(analyticsService.logEvent).mockResolvedValue();

        const req = new NextRequest('http://localhost/api/public/events', {
            method: 'POST',
            body: JSON.stringify({
                type: 'click_cta',
                page: 'pricing',
                section: 'planos',
                element: 'plano_starter',
                ts: Date.now()
            })
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(analyticsService.logEvent).toHaveBeenCalled();
        const callArgs = vi.mocked(analyticsService.logEvent).mock.calls[0][0];
        expect(callArgs.event).toBe('click_cta');
        expect(callArgs.path).toBe('pricing');
        expect(callArgs.tenantId).toBe('condstore-public');
    });
});
