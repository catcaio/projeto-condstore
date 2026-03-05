import { NextRequest, NextResponse } from 'next/server';
import { withIdempotency } from '../lib/http/with-idempotency';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';

vi.mock('../infra/db', () => ({
    getDb: vi.fn(),
}));

vi.mock('../infra/log/logger', () => ({
    structuredLogger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

describe('Idempotency Layer', () => {

    const mockDb = {
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(true) }),
        select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(true) }) }),
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        // Reset default mocks
        mockDb.insert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(true) });
        mockDb.select = vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) });
        mockDb.update = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(true) }) });

        const { getDb } = await import('../infra/db');
        (getDb as any).mockResolvedValue(mockDb);
    });

    it('bypasses idempotency logic when missing Idempotency-Key header', async () => {
        let executed = 0;
        const mockHandler = async () => {
            executed++;
            return NextResponse.json({ ok: true }, { status: 201 });
        };
        const wrapped = withIdempotency(mockHandler);

        const req1 = new NextRequest('http://localhost:3000/api/internal/test');
        const req2 = new NextRequest('http://localhost:3000/api/internal/test');

        const res1 = await wrapped(req1, { params: {} });
        const res2 = await wrapped(req2, { params: {} });

        expect(executed).toBe(2);
        expect(res1.status).toBe(201);
        expect(res2.status).toBe(201);
        // No DB calls should have been made
        expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('executes handler and saves response if Idempotency-Key is new', async () => {
        const key = crypto.randomUUID();
        let executed = 0;
        const mockHandler = async () => {
            executed++;
            return NextResponse.json({ testAttr: 'hello' }, { status: 200 });
        };
        const wrapped = withIdempotency(mockHandler);

        const req = new NextRequest('http://localhost:3000/api/internal/test', {
            headers: { 'Idempotency-Key': key }
        });

        const res = await wrapped(req, { params: {} });
        expect(executed).toBe(1);
        expect(res.status).toBe(200);

        // Let the fire-and-forget save flush
        await new Promise(resolve => setTimeout(resolve, 50));

        // Verify the DB update was called to persist the response
        expect(mockDb.update).toHaveBeenCalled();
    });

    it('returns the cached response immediately on exact replay', async () => {
        const key = crypto.randomUUID();
        let executed = 0;
        const mockHandler = async () => {
            executed++;
            return NextResponse.json({ message: 'only once' }, { status: 201 });
        };
        const wrapped = withIdempotency(mockHandler);

        const ctx = { params: { tenantId: 'tnt1' } };

        // --- First call: insert succeeds (we "own" the lock) ---
        const req1 = new NextRequest('http://localhost:3000/api/tenant/tnt1/test', {
            headers: { 'Idempotency-Key': key }
        });
        const res1 = await wrapped(req1, ctx);
        expect(res1.status).toBe(201);
        expect(executed).toBe(1);
        await new Promise(resolve => setTimeout(resolve, 50));

        // --- Second call: insert throws ER_DUP_ENTRY, select returns cached row ---
        mockDb.insert = vi.fn().mockReturnValue({
            values: vi.fn().mockRejectedValue({ code: 'ER_DUP_ENTRY' })
        });
        mockDb.select = vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ responseStatus: 201, responseBody: { message: 'only once' } }])
            })
        });

        const req2 = new NextRequest('http://localhost:3000/api/tenant/tnt1/test', {
            headers: { 'Idempotency-Key': key }
        });
        const res2 = await wrapped(req2, ctx);
        expect(res2.status).toBe(201);
        const body2 = await res2.json();
        expect(body2).toEqual({ message: 'only once' });

        // Handler must NOT have executed twice
        expect(executed).toBe(1);
    });

    it('returns 409 Conflict if operation is still pending (status null)', async () => {
        const key = crypto.randomUUID();

        // Force insert to throw ER_DUP_ENTRY
        mockDb.insert = vi.fn().mockReturnValue({
            values: vi.fn().mockRejectedValue({ code: 'ER_DUP_ENTRY' })
        });

        // Force select to return a pending record (responseStatus = null)
        mockDb.select = vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ responseStatus: null, responseBody: null }])
            })
        });

        const mockHandler = async () => NextResponse.json({ ok: true }, { status: 200 });
        const wrapped = withIdempotency(mockHandler);

        const req = new NextRequest('http://localhost:3000/api/internal/race', {
            headers: { 'idempotency-key': key }
        });

        const res = await wrapped(req, { params: {} });

        expect(res.status).toBe(409);
        const conflictData = await res.json();
        expect(conflictData.error).toContain('is already in progress');
    });

});
