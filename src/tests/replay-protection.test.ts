import { NextRequest, NextResponse } from 'next/server';
import { withReplayProtection } from '../lib/http/with-replay-protection';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';

// Mock Redis
vi.mock('../infra/redis.client', () => ({
    redisClient: {
        setNx: vi.fn(),
    },
}));

// Mock logger
vi.mock('../infra/log/logger', () => ({
    structuredLogger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

import { redisClient } from '../infra/redis.client';

describe('Replay Protection', () => {

    const nowSeconds = () => Math.floor(Date.now() / 1000);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('allows request with valid timestamp and new nonce', async () => {
        (redisClient.setNx as any).mockResolvedValue(true);

        let executed = false;
        const handler = async () => {
            executed = true;
            return NextResponse.json({ ok: true }, { status: 200 });
        };
        const wrapped = withReplayProtection(handler);

        const req = new NextRequest('http://localhost:3000/api/internal/test', {
            headers: {
                'x-request-timestamp': String(nowSeconds()),
                'x-request-nonce': crypto.randomUUID(),
            },
        });

        const res = await wrapped(req);
        expect(res.status).toBe(200);
        expect(executed).toBe(true);
        expect(redisClient.setNx).toHaveBeenCalledTimes(1);
    });

    it('returns 401 when headers are missing', async () => {
        const handler = async () => NextResponse.json({ ok: true });
        const wrapped = withReplayProtection(handler);

        // No replay headers
        const req = new NextRequest('http://localhost:3000/api/internal/test');
        const res = await wrapped(req);

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toContain('Missing required security headers');
    });

    it('returns 401 when timestamp is expired (>60s drift)', async () => {
        const handler = async () => NextResponse.json({ ok: true });
        const wrapped = withReplayProtection(handler);

        const req = new NextRequest('http://localhost:3000/api/internal/test', {
            headers: {
                'x-request-timestamp': String(nowSeconds() - 120), // 2 min ago
                'x-request-nonce': crypto.randomUUID(),
            },
        });

        const res = await wrapped(req);
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toContain('expired');
    });

    it('returns 409 when nonce is repeated (replay detected)', async () => {
        (redisClient.setNx as any).mockResolvedValue(false); // nonce already exists

        const handler = async () => NextResponse.json({ ok: true });
        const wrapped = withReplayProtection(handler);

        const req = new NextRequest('http://localhost:3000/api/internal/test', {
            headers: {
                'x-request-timestamp': String(nowSeconds()),
                'x-request-nonce': 'reused-nonce-123',
            },
        });

        const res = await wrapped(req);
        expect(res.status).toBe(409);
        const body = await res.json();
        expect(body.error).toContain('Replay detected');
    });

});
