import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

vi.mock('@/infra/db', () => ({ getDb: vi.fn() }));
vi.mock('@/infra/auth/session', () => ({ createSessionToken: vi.fn(), COOKIE_NAME: 'test_cookie' }));
vi.mock('@/infra/log/logger', () => ({ structuredLogger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));

const mockFetch = vi.fn();

describe('Google OAuth Callback', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client');
        vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-secret');
        vi.stubEnv('NEXTAUTH_URL', 'http://localhost:3000');
        vi.stubGlobal('fetch', mockFetch);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it('rejects login when email_verified is false', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ access_token: 'test-token', id_token: 'test-id', token_type: 'Bearer' })
        });

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                sub: '123',
                email: 'hacker@example.com',
                name: 'Hacker',
                picture: '',
                email_verified: false
            })
        });

        const req = new NextRequest('http://localhost:3000/api/auth/google/callback?code=test-code&state=test-state');
        req.cookies.set('google_oauth_state', 'test-state');
        const res = await GET(req);

        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toBe('http://localhost:3000/login?error=google_email_not_verified');
    });
});
