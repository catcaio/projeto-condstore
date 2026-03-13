import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

describe('middleware.ts: PUBLIC_ENDPOINTS_DISABLED kill switch', () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('allows access to /api/public/* when PUBLIC_ENDPOINTS_DISABLED is not true', async () => {
        vi.stubEnv('PUBLIC_ENDPOINTS_DISABLED', 'false');

        const req = new NextRequest(new URL('https://app.condstore.com/api/public/events'));
        const res = await middleware(req);

        // Default flow allows it to pass through middleware (returns Next without error payload)
        // The dummy NEXT response has status 200 and no JSON errors
        expect(res.status).toBe(200);
    });

    it('blocks access to /api/public/* with 503 when PUBLIC_ENDPOINTS_DISABLED is true', async () => {
        vi.stubEnv('PUBLIC_ENDPOINTS_DISABLED', 'true');

        const req = new NextRequest(new URL('https://app.condstore.com/api/public/events'));
        const res = await middleware(req);

        expect(res.status).toBe(503);
        const body = await res.json();
        expect(body).toEqual({ error: 'Service temporarily unavailable' });
    });

    it('does not block /api/internal/* when PUBLIC_ENDPOINTS_DISABLED is true', async () => {
        vi.stubEnv('PUBLIC_ENDPOINTS_DISABLED', 'true');
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('INTERNAL_TOKEN', 'valid-token');

        const req = new NextRequest('https://app.condstore.com/api/internal/diag', {
            headers: new Headers({ 'x-internal-token': 'valid-token' })
        });

        const res = await middleware(req);

        // Should hit 401 Unauthorized because INTERNAL_DIAG_TOKEN is missing in this test env,
        // or pass through as 200, but crucially it should not be a 503 killswitch response.
        expect(res.status).not.toBe(503);
    });
});
