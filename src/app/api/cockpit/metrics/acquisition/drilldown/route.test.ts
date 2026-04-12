import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';
import { requireAdmin } from '../../../../../../infra/auth/guards';
import { getDb } from '../../../../../../infra/db';

const mockExecute = vi.fn();

vi.mock('../../../../../../infra/auth/guards', () => ({
    requireAdmin: vi.fn(),
}));

vi.mock('../../../../../../infra/db', () => ({
    getDb: vi.fn(),
}));

vi.mock('../../../../../../infra/http/request-trace', () => ({
    makeRequestId: vi.fn(() => 'req-drilldown-test'),
}));

vi.mock('../../../../../../infra/logger', () => ({
    logger: {
        error: vi.fn(),
    },
}));

vi.mock('../../../../../../infra/env/devOnly', () => ({
    isDevRuntime: vi.fn(() => false),
    isQaAutomation: vi.fn(() => false),
}));

describe('GET /api/cockpit/metrics/acquisition/drilldown', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockExecute.mockReset();
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: true,
            session: { tenantId: 'tenant-1' },
        } as never);
        vi.mocked(getDb).mockResolvedValue({ execute: mockExecute } as never);
    });

    it('returns 400 for a groupBy value outside the UTM whitelist', async () => {
        const response = await GET({
            nextUrl: new URL('http://localhost/api/cockpit/metrics/acquisition/drilldown?groupBy=utm_source;DROP TABLE public_events'),
            headers: new Headers(),
        } as never);

        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body).toEqual({
            success: false,
            error: 'Invalid groupBy. Use utm_source, utm_campaign, utm_medium, utm_content or utm_term.',
        });
        expect(getDb).not.toHaveBeenCalled();
    });

    it('accepts whitelisted UTM fields and returns matching events', async () => {
        mockExecute
            .mockResolvedValueOnce([[{ count: '1' }], []])
            .mockResolvedValueOnce([[{
                id: 'event-1',
                timestamp: '2026-04-12T10:00:00.000Z',
                type: 'CLICK',
                action: 'visit',
            }], []]);

        const response = await GET({
            nextUrl: new URL('http://localhost/api/cockpit/metrics/acquisition/drilldown?groupBy=utm_medium&utm_medium=email&q=ignored'),
            headers: new Headers(),
        } as never);

        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({
            success: true,
            events: [{
                id: 'event-1',
                timestamp: '2026-04-12T10:00:00.000Z',
                type: 'CLICK',
                action: 'visit',
            }],
            meta: {
                page: 1,
                limit: 20,
                total: 1,
                totalPages: 1,
            },
        });
        expect(mockExecute).toHaveBeenCalledTimes(2);
    });
});
