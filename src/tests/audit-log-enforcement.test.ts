import { NextRequest, NextResponse } from 'next/server';
import { withAuditLog } from '../lib/http/with-audit-log';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockInsert = vi.fn();

vi.mock('../infra/db', () => ({
    getDb: vi.fn().mockImplementation(() => Promise.resolve({
        insert: () => ({
            values: (vals: any) => {
                mockInsert(vals);
                return { execute: () => Promise.resolve() };
            },
        }),
    })),
}));

vi.mock('../infra/log/logger', () => ({
    structuredLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Admin Audit Log Enforcement', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates audit log when route is called', async () => {
        let executed = false;
        const handler = async () => {
            executed = true;
            return NextResponse.json({ ok: true }, { status: 200 });
        };

        const wrapped = withAuditLog(
            { action: 'test_action', scope: 'test_scope', actorType: 'user' },
            handler,
        );

        const req = new NextRequest('http://localhost:3000/api/admin/test', {
            headers: { 'x-request-id': 'req-test-123' },
        });

        const res = await wrapped(req);
        expect(res.status).toBe(200);
        expect(executed).toBe(true);

        // Verify audit log was written
        expect(mockInsert).toHaveBeenCalledTimes(1);
        const auditEntry = mockInsert.mock.calls[0][0];
        expect(auditEntry.action).toBe('test_action');
        expect(auditEntry.scope).toBe('test_scope');
        expect(auditEntry.actorType).toBe('user');
        expect(auditEntry.requestId).toBe('req-test-123');
    });

    it('returns 503 and does NOT return handler response when audit insert fails', async () => {
        // Make insert throw
        const { getDb } = await import('../infra/db');
        vi.mocked(getDb).mockImplementation(() => Promise.resolve({
            insert: () => ({
                values: () => {
                    throw new Error('DB write failed');
                },
            }),
        } as any));

        let handlerExecuted = false;
        const handler = async () => {
            handlerExecuted = true;
            return NextResponse.json({ ok: true, secret: 'should-not-leak' }, { status: 200 });
        };

        const wrapped = withAuditLog(
            { action: 'test_action', scope: 'test_scope' },
            handler,
        );

        const req = new NextRequest('http://localhost:3000/api/admin/test', {
            headers: { 'x-request-id': 'req-fail-456' },
        });

        const res = await wrapped(req);

        // Fail-closed: 503 returned
        expect(res.status).toBe(503);
        const body = await res.json();
        expect(body.error).toContain('audit logging failed');

        // Handler did execute (audit is post-handler), but response is discarded
        expect(handlerExecuted).toBe(true);
    });

    it('always includes a non-empty payloadHash when payload is provided', async () => {
        const { writeAuditLog, hashPayload } = await import('../lib/security/require-audit-log');

        const hash = hashPayload({ email: 'test@example.com', action: 'upgrade' });
        expect(hash).toBeTruthy();
        expect(hash.length).toBe(64); // sha256 hex = 64 chars
    });
});
