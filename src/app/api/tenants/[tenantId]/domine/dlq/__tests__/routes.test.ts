import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as listDLQ } from '../route';
import { POST as retryDLQ } from '../retry/route';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('../../../../../../../infra/auth/tenant-route-guard', () => ({
    requireSessionTenantMatch: vi.fn(),
}));

vi.mock('../../../../../../../infra/repositories/domine-events.repository', () => ({
    domineEventsRepository: {
        listDLQEvents: vi.fn().mockResolvedValue([]),
        getDLQCount: vi.fn().mockResolvedValue(0),
        resetDLQEvent: vi.fn().mockResolvedValue(true),
    }
}));

vi.mock('../../../../../../../infra/http/request-trace', () => ({
    makeRequestId: () => 'req-id',
}));

import { requireSessionTenantMatch } from '../../../../../../../infra/auth/tenant-route-guard';
import { domineEventsRepository } from '../../../../../../../infra/repositories/domine-events.repository';

describe('Domine DLQ Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('blocks non-admin users from listing DLQ', async () => {
        (requireSessionTenantMatch as any).mockResolvedValue({
            ok: true,
            sessionUser: { role: 'operator' }
        });

        const req = new NextRequest('http://localhost/api/tenants/t1/domine/dlq');
        const res = await listDLQ(req, { params: { tenantId: 't1' } }) as NextResponse;

        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.error.message).toBe('Admin required');
    });

    it('allows admins to list DLQ', async () => {
        (requireSessionTenantMatch as any).mockResolvedValue({
            ok: true,
            sessionUser: { role: 'admin' }
        });

        const req = new NextRequest('http://localhost/api/tenants/t1/domine/dlq?limit=10&offset=0');
        const res = await listDLQ(req, { params: { tenantId: 't1' } }) as NextResponse;

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(domineEventsRepository.listDLQEvents).toHaveBeenCalledWith('t1', 10, 0);
    });

    it('blocks non-admin from retrying a DLQ event', async () => {
        (requireSessionTenantMatch as any).mockResolvedValue({
            ok: true,
            sessionUser: { role: 'viewer' }
        });

        const req = new NextRequest('http://localhost/api/tenants/t1/domine/dlq/retry', {
            method: 'POST',
            body: JSON.stringify({ eventId: 'evt-1' })
        });
        const res = await retryDLQ(req, { params: { tenantId: 't1' } }) as NextResponse;

        expect(res.status).toBe(403);
    });

    it('allows admin to retry a valid DLQ event', async () => {
        (requireSessionTenantMatch as any).mockResolvedValue({
            ok: true,
            sessionUser: { role: 'admin' }
        });

        const req = new NextRequest('http://localhost/api/tenants/t1/domine/dlq/retry', {
            method: 'POST',
            body: JSON.stringify({ eventId: 'evt-1' })
        });
        const res = await retryDLQ(req, { params: { tenantId: 't1' } }) as NextResponse;

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.status).toBe('re-queued');
        expect(domineEventsRepository.resetDLQEvent).toHaveBeenCalledWith('evt-1', 't1');
    });
});
