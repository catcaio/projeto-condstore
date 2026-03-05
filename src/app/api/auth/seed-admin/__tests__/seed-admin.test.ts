import { GET } from '../route';
import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as internalTokenModule from '@/infra/config/internal-token';

// Mocks
vi.mock('@/infra/db', () => ({
    getDb: vi.fn(),
}));

vi.mock('@/infra/logger', () => ({
    logger: {
        warn: vi.fn(),
        error: vi.fn(),
    }
}));

vi.mock('@/infra/log/logger', () => ({
    structuredLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/security/require-audit-log', () => ({
    writeAuditLog: vi.fn().mockResolvedValue(undefined),
    hashPayload: vi.fn().mockReturnValue('mock-hash'),
}));

function createMockRequest(url: string, headers: Record<string, string> = {}) {
    return new NextRequest(new URL(url), {
        method: 'GET',
        headers: new Headers(headers),
    });
}

describe('Seed Admin Route Guard', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv };
    });

    it('PROD sem token interno deve ser bloqueado com 403', async () => {
        process.env.IS_DEV = 'false';
        // Explicitly enable allowlist to test just the token component
        process.env.ALLOW_SEED_ADMIN = 'true';

        const req = createMockRequest('http://localhost/api/auth/seed-admin');
        const res = await GET(req);

        expect(res.status).toBe(403);
    });

    it('PROD com token interno porem sem allowlist deve ser bloqueado com 403', async () => {
        process.env.IS_DEV = 'false';
        process.env.ALLOW_SEED_ADMIN = 'false';
        vi.spyOn(internalTokenModule, 'getInternalExportTokenOrThrow').mockReturnValue('valid_internal_token');

        const req = createMockRequest('http://localhost/api/auth/seed-admin', {
            'x-internal-token': 'valid_internal_token'
        });
        const res = await GET(req);

        expect(res.status).toBe(403);
    });

    it('PROD com token interno válido E allowlist deve passar pelo guard (retorna 500 DB_URL missing na fase do banco ou mock error)', async () => {
        process.env.IS_DEV = 'false';
        process.env.ALLOW_SEED_ADMIN = 'true';
        vi.spyOn(internalTokenModule, 'getInternalExportTokenOrThrow').mockReturnValue('valid_internal_token');

        // Setup the next valid phase fail since we only care about the guard passing
        process.env.DATABASE_URL = '';

        const req = createMockRequest('http://localhost/api/auth/seed-admin', {
            'x-internal-token': 'valid_internal_token'
        });
        const res = await GET(req);

        expect(res.status).toBe(500);
        const data = await res.json();
        expect(data.error).toBe('DATABASE_URL missing');
    });

    it('DEV sem seed token deve ser bloqueado com 401', async () => {
        process.env.IS_DEV = 'true';
        process.env.SEED_TOKEN = 'expected_seed';

        const req = createMockRequest('http://localhost/api/auth/seed-admin');
        const res = await GET(req);

        expect(res.status).toBe(401);
    });

    it('DEV com seed token válido deve passar pelo guard (retorna 500 na DB phase)', async () => {
        process.env.IS_DEV = 'true';
        process.env.SEED_TOKEN = 'expected_seed';
        process.env.DATABASE_URL = '';

        const req = createMockRequest('http://localhost/api/auth/seed-admin', {
            'x-seed-token': 'expected_seed'
        });
        const res = await GET(req);

        expect(res.status).toBe(500);
        const data = await res.json();
        expect(data.error).toBe('DATABASE_URL missing');
    });
});
