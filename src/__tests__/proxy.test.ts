import { describe, it, expect, vi, beforeEach } from 'vitest';
import { proxy } from '../proxy';
import { NextRequest, NextResponse } from 'next/server';

// Mock getAuthSecret/JOSE to just return something valid if needed,
// but since the proxy returns early if headers are just manipulated,
// we can observe the NextResponse header modifications.
vi.mock('next/server', () => {
    const mockHeaders = class {
        private map = new Map<string, string>();
        constructor(init?: Record<string, string>) {
            if (init) Object.entries(init).forEach(([k, v]) => this.map.set(k.toLowerCase(), v));
        }
        get(name: string) { return this.map.get(name.toLowerCase()) || null; }
        set(name: string, value: string) { this.map.set(name.toLowerCase(), value); }
        delete(name: string) { this.map.delete(name.toLowerCase()); }
        forEach(cb: any) { this.map.forEach(cb); }
    };

    return {
        NextRequest: class MockReq {
            headers: any;
            nextUrl: any;
            cookies: any;
            url: string;
            constructor(url: string, init: any = {}) {
                this.url = url;
                this.headers = new mockHeaders(init.headers);
                this.nextUrl = { pathname: new URL(url).pathname };
                this.cookies = { get: () => null };
            }
        },
        NextResponse: {
            next: vi.fn((arg) => ({ request: arg?.request, headers: new mockHeaders() })),
            json: vi.fn((body, opts) => ({ body, ...opts, headers: new mockHeaders() })),
            redirect: vi.fn((url) => ({ url, headers: new mockHeaders() })),
        }
    };
});

describe('proxy header hardening', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('strips spoofable auth headers early from the incoming request', async () => {
        // A malicious user trying to inject tenant and role
        const req = new NextRequest('http://localhost:3000/cockpit/dashboard', {
            headers: {
                'x-tenant-id': 'evil-tenant',
                'x-auth-tenant-id': 'evil-tenant',
                'x-auth-role': 'admin',
                'x-auth-user-id': 'hacker123',
                'x-request-id': 'req-123'
            }
        });

        const response: any = await proxy(req);

        // The unauthorizedResponse redirect or json shouldn't have these evil headers passed down
        // Actually, NextResponse.redirect runs. The main thing is to verify that `req.headers` or 
        // the headers passed to `NextResponse.next({ request: { headers } })` are stripped.
        // If unauthorized, it just redirects. Let's look at the headers passed to NextResponse.next
        // But since there's no cookie, it redirects. 

        // To test the stripping on a path that calls `NextResponse.next`, we can use a non-protected route!
        const publicReq = new NextRequest('http://localhost:3000/api/public/foo', {
            headers: {
                'x-tenant-id': 'evil-tenant',
                'x-auth-tenant-id': 'evil-tenant',
                'x-auth-role': 'admin',
                'x-auth-user-id': 'hacker123',
                'x-request-id': 'req-123'
            }
        });

        const publicRes: any = await proxy(publicReq);

        // We expect NextResponse.next to be called with modified headers
        expect(NextResponse.next).toHaveBeenCalledWith(expect.objectContaining({
            request: expect.objectContaining({
                headers: expect.anything()
            })
        }));

        const forwardedHeaders = (NextResponse.next as any).mock.calls[0][0].request.headers as Headers;
        expect(forwardedHeaders.get('x-tenant-id')).toBeNull();
        expect(forwardedHeaders.get('x-auth-tenant-id')).toBeNull();
        expect(forwardedHeaders.get('x-auth-role')).toBeNull();
        expect(forwardedHeaders.get('x-auth-user-id')).toBeNull();
        // But legitimate headers like x-request-id stay
        expect(forwardedHeaders.get('x-request-id')).toBe('req-123');
    });
});
