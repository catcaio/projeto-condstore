import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import jwt from 'jsonwebtoken';
import { domineEventsRepository } from '../../../../../../../infra/repositories/domine-events.repository';
import { rateLimiter } from '../../../../../../../infra/security/rate-limiter';

// Mock dependencies
vi.mock('../../../../../../../infra/repositories/domine-events.repository', () => ({
    domineEventsRepository: {
        publish: vi.fn(),
    }
}));

vi.mock('../../../../../../../infra/repositories/public-events.repository', () => ({
    publicEventsRepository: {
        create: vi.fn(),
    }
}));

vi.mock('../../../../../../../infra/security/rate-limiter', () => ({
    rateLimiter: {
        limit: vi.fn(),
    },
    applyRateLimitHeaders: vi.fn((res) => res),
    hashRateLimitKeyForLog: vi.fn(),
}));

describe('POST /api/public/delivery/[token]/location', () => {
    const validSecret = 'scaffolding-secret-key-for-local';
    let validToken: string;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.DELIVERY_TOKEN_SECRET = validSecret;
        validToken = jwt.sign({ tenantId: 'tenant-123', deliveryId: 'del-456' }, validSecret);

        // Default allow rate limit
        (rateLimiter.limit as any).mockResolvedValue({
            allowed: true,
            remaining: 29,
            retryAfter: 0,
            resetTime: Date.now() + 60000,
        });
    });

    function createRequest(body: any) {
        return new NextRequest('http://localhost:3000/api/public/delivery/token/location', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'x-forwarded-for': '127.0.0.1' }
        });
    }

    it('should successfully publish a valid location update', async () => {
        const req = createRequest({
            lat: -23.0,
            lng: -46.0,
            accuracy: 5.5,
            timestamp: 1670000000
        });

        const res = await POST(req, { params: Promise.resolve({ token: validToken }) } as any);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.ok).toBe(true);
        expect(domineEventsRepository.publish).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 'tenant-123',
            source: 'webhook',
            type: 'DELIVERY_LOCATION_UPDATED',
            payloadJson: {
                deliveryId: 'del-456',
                lat: -23.0,
                lng: -46.0,
                accuracy: 5.5,
                timestamp: 1670000000
            }
        }));
    });

    it('should reject invalid JWT tokens', async () => {
        const req = createRequest({ lat: 0, lng: 0 });
        const res = await POST(req, { params: Promise.resolve({ token: 'invalid-token' }) } as any);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.error.message).toContain('Invalid or expired tracking token');
        expect(domineEventsRepository.publish).not.toHaveBeenCalled();
    });

    it('should reject invalid schema payloads', async () => {
        const req = createRequest({ lat: 999, lng: 0 }); // lat out of bounds
        const res = await POST(req, { params: Promise.resolve({ token: validToken }) } as any);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(domineEventsRepository.publish).not.toHaveBeenCalled();
    });

    it('should apply rate limiting', async () => {
        (rateLimiter.limit as any).mockResolvedValueOnce({
            allowed: false,
            remaining: 0,
            retryAfter: 60,
            resetTime: Date.now() + 60000,
        });

        const req = createRequest({ lat: 0, lng: 0 });
        const res = await POST(req, { params: Promise.resolve({ token: validToken }) } as any);
        const data = await res.json();

        expect(res.status).toBe(429);
        expect(data.error.message).toContain('Rate limit exceeded');
        expect(domineEventsRepository.publish).not.toHaveBeenCalled();
    });
});
