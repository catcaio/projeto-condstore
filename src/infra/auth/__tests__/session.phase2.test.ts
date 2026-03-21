import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getSessionUser, verifySessionToken, COOKIE_NAME } from '../session';

vi.mock('../repositories/user.repository', () => ({
    userRepository: {
        getUserById: vi.fn(),
    }
}));

vi.mock('jose', () => ({
    jwtVerify: vi.fn(),
    SignJWT: vi.fn()
}));

const mockJose = await import('jose');

describe('Session Mock Admin Bypass', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv('AUTH_SECRET', 'test-secret');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('denies mock-admin bypass if VERCEL_ENV is production', async () => {
        vi.stubEnv('VERCEL_ENV', 'production');
        vi.stubEnv('QA_BOOTSTRAP_TOKEN', 'some-valid-token');

        (mockJose.jwtVerify as any).mockResolvedValue({
            payload: { sub: 'mock-admin', sv: 1 }
        });

        const req = new NextRequest('http://localhost', { headers: { cookie: `${COOKIE_NAME}=dummy-token` } });

        const session = await getSessionUser(req);
        // Returns null because user is not in DB and bypass is denied in production
        expect(session).toBeNull();
    });

    it('denies mock-admin bypass if QA_BOOTSTRAP_TOKEN is missing', async () => {
        vi.stubEnv('VERCEL_ENV', 'preview');
        delete process.env.QA_BOOTSTRAP_TOKEN;

        (mockJose.jwtVerify as any).mockResolvedValue({
            payload: { sub: 'mock-admin', sv: 1 }
        });

        const req = new NextRequest('http://localhost', { headers: { cookie: `${COOKIE_NAME}=dummy-token` } });

        const session = await getSessionUser(req);
        expect(session).toBeNull();
    });

    it('allows mock-admin bypass in non-production with token', async () => {
        vi.stubEnv('VERCEL_ENV', 'preview');
        vi.stubEnv('QA_BOOTSTRAP_TOKEN', 'some-valid-token-1234');

        (mockJose.jwtVerify as any).mockResolvedValue({
            payload: { sub: 'mock-admin', sv: 1, role: 'admin' }
        });

        const req = new NextRequest('http://localhost', { headers: { cookie: `${COOKIE_NAME}=dummy-token` } });

        const session = await getSessionUser(req);
        // Bypass succeeds without hitting DB
        expect(session).not.toBeNull();
        expect(session?.sub).toBe('mock-admin');
    });
});
