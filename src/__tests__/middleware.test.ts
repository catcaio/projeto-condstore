import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

vi.mock('../lib/security/edge-logger', () => ({
    logEdgeSecurityEvent: vi.fn(),
}));

vi.mock('jose', () => ({
    jwtVerify: vi.fn(),
}));

describe('Middleware', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('blocks unauthenticated access to /api/ routes with 401', async () => {
        const req = new NextRequest('http://localhost/api/test');
        // No cookies set
        const res = await middleware(req);
        
        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.error).toBe('Missing authentication token');
    });

    it('redirects unauthenticated access to /t/ routes to /auth/login', async () => {
        const req = new NextRequest('http://localhost/t/dashboard');
        const res = await middleware(req);
        
        expect(res.status).toBe(307); // Next.js redirect default status or check headers
        expect(res.headers.get('location')).toContain('/auth/login?callbackUrl=');
        expect(res.headers.get('location')).toContain('%2Ft%2Fdashboard');
    });

    it('redirects unauthenticated access to /dashboard/ routes to /auth/login', async () => {
        const req = new NextRequest('http://localhost/dashboard/overview');
        const res = await middleware(req);
        
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toContain('/auth/login?callbackUrl=');
    });
});
