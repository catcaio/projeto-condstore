import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// 1. Mock dependencies early
vi.mock('@/infra/repositories/user.repository', () => ({
    userRepository: {
        getUserByEmail: vi.fn(),
    }
}));
vi.mock('@/infra/auth/password', () => ({
    verifyPassword: vi.fn(),
}));
vi.mock('@/infra/auth/session', () => ({
    createSessionToken: vi.fn().mockResolvedValue('mocked_token'),
    COOKIE_NAME: 'condstore_session',
}));
vi.mock('@/modules/audit/audit.service', () => ({
    auditService: {
        logEvent: vi.fn().mockResolvedValue(true),
    }
}));
vi.mock('@/infra/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
}));
vi.mock('@/infra/log/logger', () => ({
    structuredLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
}));

// 2. Import handlers after mocks are established
import { POST as authLoginPOST } from '../../app/api/auth/login/route';
import { userRepository } from '@/infra/repositories/user.repository';
import { verifyPassword } from '@/infra/auth/password';

describe('Auth Login Route - Deterministic Redirection (RBAC & Slugs)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Employee login should yield /t/[slug]/cockpit/app when slug exists', async () => {
        const req = new NextRequest('http://localhost:3000/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: 'employee@lojacond.com.br',
                password: 'validpass',
                slug: 'lojacond',
                redirectMode: 'employee'
            })
        });

        // Set up valid auth state
        (userRepository.getUserByEmail as any).mockResolvedValue({
            id: 'user-123',
            email: 'employee@lojacond.com.br',
            tenantId: 'tenant-abc',
            role: 'tenantMember',
            passwordHash: 'hashed',
            sessionVersion: 1
        });
        (verifyPassword as any).mockReturnValue(true);

        const response = await authLoginPOST(req);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.redirectUrl).toBe('/t/lojacond/cockpit/app');
    });

    it('Manager login should yield /t/[slug]/cockpit when slug exists', async () => {
        const req = new NextRequest('http://localhost:3000/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: 'manager@lojacond.com.br',
                password: 'validpass',
                slug: 'lojacond',
                redirectMode: 'manager'
            })
        });

        // Set up valid auth state
        (userRepository.getUserByEmail as any).mockResolvedValue({
            id: 'user-456',
            email: 'manager@lojacond.com.br',
            tenantId: 'tenant-abc',
            role: 'tenantAdmin',
            passwordHash: 'hashed',
            sessionVersion: 1
        });
        (verifyPassword as any).mockReturnValue(true);

        const response = await authLoginPOST(req);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.redirectUrl).toBe('/t/lojacond/cockpit');
    });

    it('Admin login / Default fallback should yield /cockpit', async () => {
        const req = new NextRequest('http://localhost:3000/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: 'admin@condstore.com.br',
                password: 'validpass',
                slug: undefined,
                redirectMode: 'admin'
            })
        });

        // Set up valid auth state
        (userRepository.getUserByEmail as any).mockResolvedValue({
            id: 'user-789',
            email: 'admin@condstore.com.br',
            tenantId: 'tenant-sys',
            role: 'globalAdmin',
            passwordHash: 'hashed',
            sessionVersion: 1
        });
        (verifyPassword as any).mockReturnValue(true);

        const response = await authLoginPOST(req);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.redirectUrl).toBe('/cockpit');
    });

});
