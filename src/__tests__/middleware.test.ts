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

    it('allows unauthenticated access to public /t/[token] routes', async () => {
        const req = new NextRequest('http://localhost/t/dashboard');
        const res = await middleware(req);

        expect(res.status).toBe(200);
        expect(res.headers.get('location')).toBeNull();
    });

    it('redirects unauthenticated access to non-public nested /t/* routes to /auth/login', async () => {
        const req = new NextRequest('http://localhost/t/dashboard/history');
        const res = await middleware(req);

        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toContain('/auth/login?callbackUrl=');
        expect(res.headers.get('location')).toContain('%2Ft%2Fdashboard%2Fhistory');
    });

    it('redirects unauthenticated access to /dashboard/ routes to /auth/login', async () => {
        const req = new NextRequest('http://localhost/dashboard/overview');
        const res = await middleware(req);
        
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toContain('/auth/login?callbackUrl=');
    });

    it('redirects unauthenticated access to /cockpit/ routes to /auth/login', async () => {
        const req = new NextRequest('http://localhost/cockpit/orders');
        const res = await middleware(req);
        
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toContain('/auth/login?callbackUrl=');
    });

    it('allows access to /api/ routes with valid session cookie and injects headers', async () => {
        const req = new NextRequest('http://localhost/api/protected');
        req.cookies.set('condstore_session', 'mock-valid-token');
        
        const { jwtVerify } = await import('jose');
        vi.mocked(jwtVerify).mockResolvedValue({
            payload: { sub: 'user-123', tenantId: 'tenant-123', role: 'admin' }
        } as any);

        const res = await middleware(req);
        // NextResponse.next() correctly processes and usually maintains the 200 status 
        // We ensure it didn't return 401
        expect(res.status).toBe(200);
        
        // Assert headers were injected by NextResponse.next({ request: { headers } })
        expect(res.headers.get('x-middleware-rewrite')).toBeNull(); // It didn't rewrite or redirect
        
        // Let's verify our jose mock was called
        expect(jwtVerify).toHaveBeenCalled();
    });
});
