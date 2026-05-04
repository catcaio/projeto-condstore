import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as signupPost } from '@/app/api/auth/signup/route';
import { GET as googleGet } from '@/app/api/auth/google/route';
import { GET as googleCallbackGet } from '@/app/api/auth/google/callback/route';
import { NextRequest } from 'next/server';
import { getDb } from '@/infra/db';
import { users } from '@/drizzle/schema';

vi.mock('@/infra/security/rate-limiter', () => ({
    rateLimiter: {
        limit: vi.fn(() => Promise.resolve({ allowed: true, remaining: 5, resetAt: Date.now() + 60000, limit: 5 })),
    },
    hashRateLimitKeyForLog: vi.fn(() => 'hashed-ip'),
}));

vi.mock('@/infra/db', () => ({
    getDb: vi.fn(),
}));

vi.mock('@/infra/auth/password', () => ({
    hashPassword: vi.fn(() => 'hashed-password'),
}));

vi.mock('@/infra/auth/session', () => ({
    createSessionToken: vi.fn(() => 'mock-token'),
    COOKIE_NAME: 'condstore-session',
}));

vi.mock('@/infra/log/logger', () => ({
    structuredLogger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('@/modules/email/email.service', () => ({
    emailService: {
        sendEmail: vi.fn(),
    },
}));

vi.mock('@/modules/auth/provisioning', () => ({
    provisionNewTenant: vi.fn(() => Promise.resolve({ tenantId: 'new-tenant', role: 'admin' })),
    resolveTenantByPolicy: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/infra/env/critical-runtime', () => ({
    getPublicAppUrl: vi.fn(() => 'http://localhost:3000'),
    getAuthSecretBytes: vi.fn(() => Buffer.from('test-secret-at-least-32-bytes-long-for-aes-256')),
}));

vi.mock('@/infra/env/require-env', () => ({
    getEnvMisconfigurationResponse: vi.fn(() => null),
}));

// Mock global fetch for OAuth
global.fetch = vi.fn();

describe('Auth Blindage (Security Hardening)', () => {
    let mockDb: any;
    let mockQuery: any;

    beforeEach(() => {
        vi.clearAllMocks();
        
        mockQuery = {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            values: vi.fn().mockReturnThis(),
            set: vi.fn().mockReturnThis(),
            execute: vi.fn().mockResolvedValue([]),
            then: vi.fn().mockImplementation((onFulfilled) => {
                return Promise.resolve([]).then(onFulfilled);
            }),
        };

        mockDb = {
            select: vi.fn(() => mockQuery),
            insert: vi.fn(() => mockQuery),
            update: vi.fn(() => mockQuery),
            delete: vi.fn(() => mockQuery),
            execute: vi.fn().mockResolvedValue([]),
        };
        
        (getDb as any).mockResolvedValue(mockDb);
        process.env.GOOGLE_CLIENT_ID = 'test-id';
        process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
        process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
        process.env.NODE_ENV = 'test';
    });

    describe('POST /api/auth/signup', () => {
        it('should reject provider="google" in the body and force "email"', async () => {
            const req = new NextRequest('http://localhost/api/auth/signup', {
                method: 'POST',
                body: JSON.stringify({
                    name: 'Test',
                    email: 'test@example.com',
                    password: 'password123',
                    roleRequested: 'operator',
                    provider: 'google'
                })
            });

            // Mocks for select().from().where()
            mockQuery.then.mockImplementationOnce((resolve: any) => resolve([])); // User existing check
            mockQuery.then.mockImplementationOnce((resolve: any) => resolve([])); // Invite check
            mockQuery.then.mockImplementationOnce((resolve: any) => resolve([])); // Policy check
            
            const res = await signupPost(req);
            expect(res.status).toBe(201);
            
            expect(mockDb.insert).toHaveBeenCalledWith(users);
            const insertValues = mockQuery.values.mock.calls[0][0];
            expect(insertValues.authProvider).toBe('email');
        });

        it('should require password (Zod validation)', async () => {
            const req = new NextRequest('http://localhost/api/auth/signup', {
                method: 'POST',
                body: JSON.stringify({
                    name: 'Test',
                    email: 'test@example.com',
                    roleRequested: 'operator'
                })
            });

            const res = await signupPost(req);
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toBeDefined();
        });

        it('should not return devMsg in case of error', async () => {
            // Mock DB failure by making .from() throw
            mockQuery.from.mockImplementationOnce(() => { throw new Error('DB Error'); });

            const req = new NextRequest('http://localhost/api/auth/signup', {
                method: 'POST',
                body: JSON.stringify({
                    name: 'Test',
                    email: 'test@example.com',
                    password: 'password123',
                    roleRequested: 'operator'
                })
            });

            const res = await signupPost(req);
            expect(res.status).toBe(500);
            const data = await res.json();
            expect(data.devMsg).toBeUndefined();
        });
    });

    describe('GET /api/auth/google', () => {
        it('should generate a state cookie and include it in redirect URL', async () => {
            const res = await googleGet();
            expect(res.status).toBe(307);
            const location = res.headers.get('location');
            expect(location).toContain('state=');
            
            const cookies = res.cookies.get('google_oauth_state');
            expect(cookies).toBeDefined();
            expect(cookies?.httpOnly).toBe(true);
        });
    });

    describe('GET /api/auth/google/callback', () => {
        it('should reject if state is missing in query', async () => {
            const req = new NextRequest('http://localhost/api/auth/google/callback?code=abc');
            req.cookies.set('google_oauth_state', 'valid-state');

            const res = await googleCallbackGet(req);
            expect(res.status).toBe(307);
            expect(res.headers.get('location')).toContain('error=google_invalid_state');
        });

        it('should reject if state is mismatch', async () => {
            const req = new NextRequest('http://localhost/api/auth/google/callback?code=abc&state=wrong');
            req.cookies.set('google_oauth_state', 'valid-state');

            const res = await googleCallbackGet(req);
            expect(res.headers.get('location')).toContain('error=google_invalid_state');
        });

        it('should reject if account exists with different provider (account takeover)', async () => {
            const req = new NextRequest('http://localhost/api/auth/google/callback?code=abc&state=valid');
            req.cookies.set('google_oauth_state', 'valid');

            (global.fetch as any).mockImplementation((url: string) => {
                if (url.includes('token')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ access_token: 'at' }) });
                if (url.includes('userinfo')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ email: 'taken@example.com', email_verified: true, sub: 'google-sub' }) });
                return Promise.reject('Not found');
            });

            mockQuery.then.mockImplementationOnce((resolve: any) => resolve([{ id: 'u1', email: 'taken@example.com', authProvider: 'email' }]));

            const res = await googleCallbackGet(req);
            expect(res.headers.get('location')).toContain('error=account_exists_different_provider');
        });

        it('should reject if providerId mismatches', async () => {
            const req = new NextRequest('http://localhost/api/auth/google/callback?code=abc&state=valid');
            req.cookies.set('google_oauth_state', 'valid');

            (global.fetch as any).mockImplementation((url: string) => {
                if (url.includes('token')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ access_token: 'at' }) });
                if (url.includes('userinfo')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ email: 'user@example.com', email_verified: true, sub: 'new-sub' }) });
                return Promise.reject('Not found');
            });

            mockQuery.then.mockImplementationOnce((resolve: any) => resolve([{ id: 'u1', email: 'user@example.com', authProvider: 'google', providerId: 'old-sub' }]));

            const res = await googleCallbackGet(req);
            expect(res.headers.get('location')).toContain('error=google_provider_id_mismatch');
        });

        it('should create user server-side if it does not exist', async () => {
            const req = new NextRequest('http://localhost/api/auth/google/callback?code=abc&state=valid');
            req.cookies.set('google_oauth_state', 'valid');

            (global.fetch as any).mockImplementation((url: string) => {
                if (url.includes('token')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ access_token: 'at' }) });
                if (url.includes('userinfo')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ email: 'new@example.com', email_verified: true, sub: 'google-sub', name: 'New User' }) });
                return Promise.reject('Not found');
            });

            mockQuery.then.mockImplementationOnce((resolve: any) => resolve([])); // Existing user check -> none
            mockQuery.then.mockImplementationOnce((resolve: any) => resolve([])); // Policy check -> none
            mockQuery.then.mockImplementationOnce((resolve: any) => resolve([{ id: 'new-u', email: 'new@example.com', authProvider: 'google', tenantId: 't1', role: 'admin', sessionVersion: 1 }])); // User after create

            const res = await googleCallbackGet(req);
            expect(res.headers.get('location')).toContain('/cockpit');
            expect(mockDb.insert).toHaveBeenCalledWith(users);
        });

        it('should reject if selfSignupEnabled is false for resolved tenant', async () => {
            const req = new NextRequest('http://localhost/api/auth/google/callback?code=abc&state=valid');
            req.cookies.set('google_oauth_state', 'valid');

            (global.fetch as any).mockImplementation((url: string) => {
                if (url.includes('token')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ access_token: 'at' }) });
                if (url.includes('userinfo')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ email: 'new@example.com', email_verified: true, sub: 'google-sub', name: 'New User' }) });
                return Promise.reject('Not found');
            });

            // Mock resolveTenantByPolicy resolving to a tenant
            const resolveTenantByPolicyMock = await import('@/modules/auth/provisioning');
            (resolveTenantByPolicyMock.resolveTenantByPolicy as any).mockResolvedValueOnce('tenant-123');

            mockQuery.then.mockImplementationOnce((resolve: any) => resolve([])); // Existing user check -> none
            mockQuery.then.mockImplementationOnce((resolve: any) => resolve([{ tenantId: 'tenant-123', selfSignupEnabled: false }])); // Policy check -> disabled

            const res = await googleCallbackGet(req);
            expect(res.headers.get('location')).toContain('error=signup_not_allowed');
        });
    });
});
