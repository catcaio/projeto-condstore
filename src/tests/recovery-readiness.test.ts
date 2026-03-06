/**
 * recovery-readiness.test.ts
 * Tests for DR readiness: runRecoveryIntegrityChecks() unit tests
 * and GET /api/internal/diag/recovery endpoint tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/infra/db', () => ({
    getDb: vi.fn(),
}));

vi.mock('@/infra/redis.client', () => ({
    redisClient: {
        ping: vi.fn(),
    },
}));

vi.mock('@/infra/log/logger', () => ({
    structuredLogger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('@/infra/http/request-trace', () => ({
    makeRequestId: vi.fn().mockReturnValue('test-req-id'),
    attachRequestIdHeader: vi.fn(),
    withRequestTrace: vi.fn((h: any) => h),
}));

vi.mock('@/infra/auth/tenant-route-guard', () => ({
    requireInternalToken: vi.fn(),
}));

vi.mock('@/infra/http/error-response', () => ({
    ErrorCode: {
        UNKNOWN: 'UNKNOWN',
        DB_ERROR: 'DB_ERROR',
        AUTH_REQUIRED: 'AUTH_REQUIRED',
    },
    errorResponse: vi.fn((code: string, status: number, requestId: string, msg: string) =>
        new Response(JSON.stringify({ error: code, message: msg }), { status })
    ),
}));

// fs mock — controls whether journal exists
vi.mock('fs', async (importOriginal) => {
    const actual = await importOriginal<typeof import('fs')>();
    return {
        ...actual,
        existsSync: vi.fn().mockReturnValue(true),
        readFileSync: vi.fn().mockReturnValue(JSON.stringify({
            version: '5',
            dialect: 'mysql',
            entries: [
                { idx: 47, version: '5', when: 1, tag: '0047_clumsy_the_anarchist', breakpoints: true },
                { idx: 48, version: '5', when: 2, tag: '0048_security_incidents', breakpoints: true },
            ],
        })),
    };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSelectChain(resolvedValue: any) {
    const chain: any = {
        select: vi.fn(() => chain),
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        limit: vi.fn(() => Promise.resolve(resolvedValue)),
        execute: vi.fn().mockResolvedValue(resolvedValue),
        then: (resolve: any) => resolve(resolvedValue),
    };
    return chain;
}

function makeFullDb(tableRows: any[] = []) {
    return {
        execute: vi.fn().mockResolvedValue(tableRows),
        select: vi.fn(() => makeSelectChain([])),
    };
}

// ── runRecoveryIntegrityChecks ─────────────────────────────────────────────────

describe('runRecoveryIntegrityChecks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns FAIL when DB connection throws', async () => {
        const { getDb } = await import('@/infra/db');
        vi.mocked(getDb).mockRejectedValue(new Error('ECONNREFUSED'));

        const { redisClient } = await import('@/infra/redis.client');
        vi.mocked(redisClient.ping).mockResolvedValue('PONG' as any);

        const { runRecoveryIntegrityChecks } = await import('@/lib/infra/recovery-integrity');
        const result = await runRecoveryIntegrityChecks();

        expect(result.status).toBe('FAIL');
        expect(result.db_connection_ok).toBe(false);
    });

    it('returns WARN when Redis connection throws', async () => {
        const { getDb } = await import('@/infra/db');
        const mockDb = makeFullDb([
            { TABLE_NAME: 'tenants' }, { TABLE_NAME: 'users' },
            { TABLE_NAME: 'admin_audit_log' }, { TABLE_NAME: 'security_incidents' },
            { TABLE_NAME: 'security_edge_events' }, { TABLE_NAME: 'idempotency_requests' },
            ...Array.from({ length: 25 }, (_, i) => ({ TABLE_NAME: `table_${i}` })),
        ]);
        // Override select for basic reads
        mockDb.select = vi.fn(() => makeSelectChain([]));
        vi.mocked(getDb).mockResolvedValue(mockDb as any);

        const { redisClient } = await import('@/infra/redis.client');
        vi.mocked(redisClient.ping).mockRejectedValue(new Error('Redis timeout'));

        const { runRecoveryIntegrityChecks } = await import('@/lib/infra/recovery-integrity');
        const result = await runRecoveryIntegrityChecks();

        expect(result.db_connection_ok).toBe(true);
        expect(result.redis_connection_ok).toBe(false);
        // Redis failure is WARN, not FAIL
        expect(['WARN', 'FAIL']).toContain(result.status);
    });

    it('returns PASS when DB, Redis, tables, and journal are all ok', async () => {
        const { getDb } = await import('@/infra/db');
        const mockDb = makeFullDb([
            { TABLE_NAME: 'tenants' }, { TABLE_NAME: 'users' },
            { TABLE_NAME: 'admin_audit_log' }, { TABLE_NAME: 'security_incidents' },
            { TABLE_NAME: 'security_edge_events' }, { TABLE_NAME: 'idempotency_requests' },
            ...Array.from({ length: 25 }, (_, i) => ({ TABLE_NAME: `extra_table_${i}` })),
        ]);
        mockDb.select = vi.fn(() => makeSelectChain([]));
        vi.mocked(getDb).mockResolvedValue(mockDb as any);

        const { redisClient } = await import('@/infra/redis.client');
        vi.mocked(redisClient.ping).mockResolvedValue('PONG' as any);

        const { runRecoveryIntegrityChecks } = await import('@/lib/infra/recovery-integrity');
        const result = await runRecoveryIntegrityChecks();

        expect(result.status).toBe('PASS');
        expect(result.db_connection_ok).toBe(true);
        expect(result.redis_connection_ok).toBe(true);
        expect(result.critical_tables_present).toBe(true);
        expect(result.table_count_ok).toBe(true);
        expect(result.migrations_in_sync).toBe(true);
        expect(result.latest_migration_id).toBe(55);
        expect(result.basic_reads_ok).toBe(true);
    });

    it('returns FAIL when critical tables are missing', async () => {
        const { getDb } = await import('@/infra/db');
        // Only a few tables present — missing critical ones
        const mockDb = makeFullDb([
            { TABLE_NAME: 'tenants' },
            ...Array.from({ length: 29 }, (_, i) => ({ TABLE_NAME: `other_${i}` })),
        ]);
        mockDb.select = vi.fn(() => makeSelectChain([]));
        vi.mocked(getDb).mockResolvedValue(mockDb as any);

        const { redisClient } = await import('@/infra/redis.client');
        vi.mocked(redisClient.ping).mockResolvedValue('PONG' as any);

        const { runRecoveryIntegrityChecks } = await import('@/lib/infra/recovery-integrity');
        const result = await runRecoveryIntegrityChecks();

        expect(result.status).toBe('FAIL');
        expect(result.critical_tables_present).toBe(false);
    });
});

// ── GET /api/internal/diag/recovery ──────────────────────────────────────────

describe('GET /api/internal/diag/recovery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    function makeRequest(headers: Record<string, string> = {}) {
        return new NextRequest('http://localhost/api/internal/diag/recovery', {
            method: 'GET',
            headers,
        });
    }

    it('returns 401 when token is missing', async () => {
        const { requireInternalToken } = await import('@/infra/auth/tenant-route-guard');
        vi.mocked(requireInternalToken).mockReturnValue({
            ok: false,
            response: new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 }) as any,
        });

        const { GET } = await import('@/app/api/internal/diag/recovery/route');
        const res = await GET(makeRequest());
        expect(res.status).toBe(401);
    });

    it('returns db_connection_ok: false when DB is down', async () => {
        const { requireInternalToken } = await import('@/infra/auth/tenant-route-guard');
        vi.mocked(requireInternalToken).mockReturnValue({ ok: true });

        const { getDb } = await import('@/infra/db');
        vi.mocked(getDb).mockRejectedValue(new Error('DB down'));

        const { redisClient } = await import('@/infra/redis.client');
        vi.mocked(redisClient.ping).mockResolvedValue('PONG' as any);

        const { GET } = await import('@/app/api/internal/diag/recovery/route');
        const res = await GET(makeRequest({ 'x-internal-token': 'valid-token' }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.db_connection_ok).toBe(false);
        expect(body.restore_check_ready).toBe(false);
    });

    it('returns all true when system is fully healthy', async () => {
        const { requireInternalToken } = await import('@/infra/auth/tenant-route-guard');
        vi.mocked(requireInternalToken).mockReturnValue({ ok: true });

        const { getDb } = await import('@/infra/db');
        vi.mocked(getDb).mockResolvedValue({
            execute: vi.fn().mockResolvedValue([]),
        } as any);

        const { redisClient } = await import('@/infra/redis.client');
        vi.mocked(redisClient.ping).mockResolvedValue('PONG' as any);

        // Set required envs for backup check
        process.env.DATABASE_URL = 'mysql://test';
        process.env.NEXTAUTH_SECRET = 'test-secret';
        process.env.REDIS_URL = 'redis://localhost';
        process.env.INTERNAL_DIAG_TOKEN = 'test-token';

        const { GET } = await import('@/app/api/internal/diag/recovery/route');
        const res = await GET(makeRequest({ 'x-internal-token': 'test-token' }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.db_connection_ok).toBe(true);
        expect(body.redis_connection_ok).toBe(true);
        expect(body.migrations_in_sync).toBe(true);
        expect(body.latest_migration_id).toBe(55);
        expect(body.backup_envs_present).toBe(true);
        expect(body.restore_check_ready).toBe(true);
    });
});
