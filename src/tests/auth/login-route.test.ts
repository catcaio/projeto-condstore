import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/login/route';
import { rateLimiter } from '@/infra/security/rate-limiter';
import { userRepository } from '@/infra/repositories/user.repository';

vi.mock('@/infra/db', () => ({
    getDb: vi.fn(),
}));

vi.mock('@/infra/security/rate-limiter', () => ({
    rateLimiter: {
        limit: vi.fn(),
    },
    hashRateLimitKeyForLog: vi.fn().mockReturnValue('mock-hash'),
}));

vi.mock('@/infra/repositories/user.repository', () => ({
    userRepository: {
        getUserByEmail: vi.fn(),
    },
}));

vi.mock('@/infra/auth/password', () => ({
    verifyPassword: vi.fn(),
}));

vi.mock('@/infra/auth/session', () => ({
    createSessionToken: vi.fn().mockResolvedValue('fake-jwt-token'),
    COOKIE_NAME: 'condstore_session',
}));

describe('Login API Route Hardening', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();
        vi.stubEnv('NODE_ENV', 'test');
        process.env.DATABASE_URL = 'mysql://root:root@localhost:3306/db';
        process.env.AUTH_SECRET = 'login-auth-secret-with-32-bytes';
        process.env.PII_ENCRYPTION_KEY = 'a'.repeat(64); // Valid hex key
        process.env.INTERNAL_DIAG_TOKEN = 'test-token';
        process.env.INTERNAL_EXPORT_TOKEN = 'test-token';
        process.env.INTERNAL_JOB_TOKEN = 'test-token';
        process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    });

    it('should return 429 JSON when rate limited, never HTML', async () => {
        vi.mocked(rateLimiter.limit).mockResolvedValue({
            allowed: false,
            remaining: 0,
            resetAt: Date.now() + 60000,
            limit: 5,
        });

        const req = new NextRequest('http://localhost:3000/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: 'test@condstore.local', password: 'pass' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(429);
        expect(res.headers.get('content-type')).toContain('application/json');

        const data = await res.json();
        expect(data.success).toBe(false);
        expect(data.error).toBe('Muitas tentativas. Tente novamente em alguns minutos.');
    });

    it('should return 401 JSON on invalid credentials, never HTML', async () => {
        vi.mocked(rateLimiter.limit).mockResolvedValue({
            allowed: true,
            remaining: 5,
            resetAt: Date.now() + 60000,
            limit: 5,
        });

        vi.mocked(userRepository.getUserByEmail).mockResolvedValue(null); // Not found

        const req = new NextRequest('http://localhost:3000/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: 'fake@condstore.local', password: 'pass' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(401);
        expect(res.headers.get('content-type')).toContain('application/json');

        const data = await res.json();
        expect(data.success).toBe(false);
        expect(data.error).toBe('Email ou senha inválidos');
    });

    it('should return 500 JSON if DATABASE_URL is missing outside development', async () => {
        delete process.env.DATABASE_URL;

        const req = new NextRequest('http://localhost:3000/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: 'test@condstore.local', password: 'pass' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(500);
        expect(res.headers.get('content-type')).toContain('application/json');

        const data = await res.json();
        expect(data).toMatchObject({
            success: false,
            error: 'Sistema em manutenção ou misconfigurado.',
            code: 'MISSING_DATABASE_URL',
        });
    });
});
