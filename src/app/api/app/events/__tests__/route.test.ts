import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { getDb } from '../../../../../infra/db';
import { tenantEvents } from '../../../../../drizzle/schema';
import { redisClient } from '../../../../../infra/redis.client';
import { getServerSessionUser } from '../../../../../infra/auth/session';

vi.mock('../../../../../infra/db', () => ({
    getDb: vi.fn().mockResolvedValue({
        insert: vi.fn().mockReturnValue({ values: vi.fn() }),
    })
}));

vi.mock('../../../../../infra/auth/session', () => ({
    getServerSessionUser: vi.fn()
}));

vi.mock('../../../../../infra/redis.client', () => ({
    redisClient: {
        setNx: vi.fn().mockResolvedValue(true),
    }
}));

vi.mock('../../../../../infra/security/rate-limiter', () => ({
    rateLimiter: {
        limit: vi.fn().mockResolvedValue({ allowed: true, remaining: 59 })
    },
    hashRateLimitKeyForLog: vi.fn(),
    applyRateLimitHeaders: vi.fn((res) => res)
}));

describe('POST /api/app/events', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getServerSessionUser as any).mockResolvedValue({ sub: 'user_1', tenantId: 'tenant_1' });
    });

    const createRequest = (body: any) => {
        return new NextRequest('http://localhost:3000/api/app/events', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    };

    it('returns 400 for invalid schema types', async () => {
        const req = createRequest({ type: 'invalid_type', ts: Date.now() });
        const res = await POST(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('blocks PII in metadata and cleans it', async () => {
        const ts = Date.now();
        const req = createRequest({
            type: 'signup_created',
            ts,
            metadata: {
                someKey: 'value',
                email: 'test@example.com',
                passwordHash: 'secret'
            }
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        const dbMock = await import('../../../../../infra/db');
        const dbInstance = await dbMock.getDb();
        const insertValuesMock = dbInstance.insert(tenantEvents as any).values as any;

        const call = insertValuesMock.mock.calls[0][0];
        const payload = JSON.parse(call.payload);

        expect(payload.metadata.email).toBeUndefined();
        expect(payload.metadata.passwordHash).toBeUndefined();
        expect(payload.metadata.someKey).toBe('value');
    });

    it('dedups events using redis setNx and returns ok true for duplicate', async () => {
        (redisClient.setNx as any).mockResolvedValueOnce(false); // Already exists

        const req = createRequest({ type: 'cockpit_viewed', ts: Date.now() });
        const res = await POST(req);

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.dedup).toBe(true);

        const dbMock = await import('../../../../../infra/db');
        const dbInstance = await dbMock.getDb();
        expect((dbInstance.insert as any).mock.calls.length).toBe(0); // Not inserted
    });

    it('returns 401 if user is not authenticated', async () => {
        (getServerSessionUser as any).mockResolvedValue(null);

        const req = createRequest({ type: 'signup_created', ts: Date.now() });
        const res = await POST(req);

        expect(res.status).toBe(401);
    });
});
