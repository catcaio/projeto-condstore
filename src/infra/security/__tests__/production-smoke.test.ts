import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '../../../middleware';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Production Smoke Test - Middleware', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        process.env = originalEnv;
    });

    it('bloqueia /api/internal/* sem token em producao', async () => {
        vi.stubEnv('NODE_ENV', 'production');
        process.env.INTERNAL_DIAG_TOKEN = 'secret123';

        const req = new NextRequest('http://localhost:3000/api/internal/diag');
        const res = await middleware(req) as NextResponse;

        expect(res).toBeDefined();
        expect(res.status).toBe(401);
    });

    it('permite /api/internal/* com token valido em producao', async () => {
        vi.stubEnv('NODE_ENV', 'production');
        process.env.INTERNAL_DIAG_TOKEN = 'secret123';

        const req = new NextRequest('http://localhost:3000/api/internal/diag', {
            headers: new Headers({ 'x-internal-token': 'secret123' })
        });

        const res = await middleware(req) as NextResponse;
        expect(res.status).not.toBe(401);
    });

    it('NÃO bloqueia /api/webhooks/* sem token', async () => {
        vi.stubEnv('NODE_ENV', 'production');
        process.env.INTERNAL_DIAG_TOKEN = 'secret123';

        const req = new NextRequest('http://localhost:3000/api/webhooks/twilio');
        const res = await middleware(req) as NextResponse;

        expect(res.status).not.toBe(401);
    });

    it('mantem fail-closed em dev quando nenhum token interno é enviado', async () => {
        vi.stubEnv('NODE_ENV', 'development');

        const req = new NextRequest('http://localhost:3000/api/internal/diag');
        const res = await middleware(req) as NextResponse;

        expect(res.status).toBe(401);
    });
});
