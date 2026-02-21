/**
 * Unit tests for the WhatsApp 24-hour window utility.
 *
 * Tests shouldUseTemplate() in isolation by mocking the DB query.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// We mock the entire db module before importing the module under test
vi.mock('../../../lib/db/client', () => ({
    db: {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn(),
    },
}));

vi.mock('../../drizzle/schema', () => ({
    messages: { createdAt: 'createdAt', tenantId: 'tenantId', fromPhone: 'fromPhone', direction: 'direction' },
}));

vi.mock('drizzle-orm', () => ({
    and: (...args: any[]) => args,
    eq: (col: any, val: any) => ({ col, val }),
    desc: (col: any) => col,
    gte: (col: any, val: any) => ({ col, val }),
}));

import { db } from '../../../lib/db/client';
import { shouldUseTemplate } from '../window';

const mockDb = db as any;

describe('shouldUseTemplate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns false (freeform OK) when there is a recent inbound message', async () => {
        mockDb.limit.mockResolvedValueOnce([
            { createdAt: new Date(Date.now() - 5 * 60 * 1000) }, // 5 min ago
        ]);

        const result = await shouldUseTemplate('tenant-1', 'whatsapp:+5511999990001');
        expect(result).toBe(false);
    });

    it('returns true (use template) when no recent inbound message', async () => {
        mockDb.limit.mockResolvedValueOnce([]); // No rows = outside window

        const result = await shouldUseTemplate('tenant-1', 'whatsapp:+5511999990002');
        expect(result).toBe(true);
    });

    it('returns true (fail safe to template) when DB query throws', async () => {
        mockDb.limit.mockRejectedValueOnce(new Error('DB timeout'));

        const result = await shouldUseTemplate('tenant-1', 'whatsapp:+5511999990003');
        expect(result).toBe(true); // Fail open → template
    });
});

describe('getSlaTimeoutMinutes / getStaleSessionMinutes', () => {
    it('returns the parsed SESSION_SLA_TIMEOUT_MINUTES env', async () => {
        process.env.SESSION_SLA_TIMEOUT_MINUTES = '45';
        const { getSlaTimeoutMinutes } = await import('../window');
        expect(getSlaTimeoutMinutes()).toBe(45);
        delete process.env.SESSION_SLA_TIMEOUT_MINUTES;
    });

    it('defaults to 60 when env is unset', async () => {
        delete process.env.SESSION_SLA_TIMEOUT_MINUTES;
        const { getSlaTimeoutMinutes } = await import('../window');
        expect(getSlaTimeoutMinutes()).toBe(60);
    });
});
