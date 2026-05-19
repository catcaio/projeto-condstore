import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPublish = vi.fn();
const mockIsDomineEnabled = vi.fn(async (tenantId: string) => tenantId === 'TEST_TENANT');

vi.mock('@/infra/repositories/domine-events.repository', () => ({
    domineEventsRepository: { publish: (...args: any[]) => mockPublish(...args) },
}));

vi.mock('@/infra/log/logger', () => ({
    structuredLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../tenant', () => ({
    isDomineEnabled: (...args: any[]) => mockIsDomineEnabled(...args),
}));

import { DomineIntakeService, DomineIntakeError } from '../domine-intake.service';

describe('DomineIntakeService', () => {
    let svc: DomineIntakeService;

    beforeEach(() => {
        vi.clearAllMocks();
        svc = new DomineIntakeService();
        mockPublish.mockResolvedValue({ id: 'evt-1', inserted: true });
    });

    // ── Validation ────────────────────────────────────────────────────

    it('rejects missing tenantId', async () => {
        await expect(svc.publish({ tenantId: '', type: 'FINOPS_EVENT', source: 'cockpit', payload: {} }))
            .rejects.toThrow(DomineIntakeError);
    });

    it('rejects missing type', async () => {
        await expect(svc.publish({ tenantId: 'TEST_TENANT', type: '', source: 'cockpit', payload: {} }))
            .rejects.toThrow(DomineIntakeError);
    });

    it('rejects invalid source', async () => {
        await expect(svc.publish({ tenantId: 'TEST_TENANT', type: 'WEBHOOK_RECEIVED', source: 'invalid_source' as any, payload: {} }))
            .rejects.toThrow(DomineIntakeError);
    });

    // ── Tenant enablement guard ───────────────────────────────────────

    it('rejects tenants without domine enabled', async () => {
        await expect(svc.publish({ tenantId: 'OTHER_TENANT', type: 'FINOPS_EVENT', source: 'cockpit', payload: {} }))
            .rejects.toThrow('not enabled');
    });

    it('rejects disabled tenants with correct error code', async () => {
        try {
            await svc.publish({ tenantId: 'OTHER_TENANT', type: 'FINOPS_EVENT', source: 'cockpit', payload: {} });
        } catch (e: any) {
            expect(e).toBeInstanceOf(DomineIntakeError);
            expect(e.code).toBe('TENANT_NOT_ENABLED');
        }
    });

    // ── Happy path ───────────────────────────────────────────────────

    it('publishes for enabled tenant and returns result', async () => {
        const result = await svc.publish({
            tenantId: 'TEST_TENANT',
            type: 'FREIGHT_QUOTE_REQUESTED',
            source: 'cockpit',
            payload: { foo: 'bar' },
            idempotencyKey: 'idem-123',
        });

        expect(result).toEqual({ id: 'evt-1', inserted: true });
        expect(mockPublish).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 'TEST_TENANT',
            type: 'FREIGHT_QUOTE_REQUESTED',
            source: 'cockpit',
            idempotencyKey: 'idem-123',
        }));
    });

    it('auto-generates idempotencyKey when omitted', async () => {
        await svc.publish({
            tenantId: 'TEST_TENANT',
            type: 'WEBHOOK_RECEIVED',
            source: 'webhook',
            payload: {},
        });

        const call = mockPublish.mock.calls[0][0];
        expect(call.idempotencyKey).toBeDefined();
        expect(call.idempotencyKey.length).toBeGreaterThan(0);
    });

    // ── Idempotency ─────────────────────────────────────────────────

    it('returns inserted:false when repository detects duplicate', async () => {
        mockPublish.mockResolvedValue({ id: 'evt-1', inserted: false });

        const result = await svc.publish({
            tenantId: 'TEST_TENANT',
            type: 'FINOPS_EVENT',
            source: 'internal',
            idempotencyKey: 'dup-key',
            payload: {},
        });

        expect(result.inserted).toBe(false);
    });

    // ── PII safety ──────────────────────────────────────────────────

    it('never passes raw payload to structuredLogger', async () => {
        const { structuredLogger } = await import('@/infra/log/logger');

        await svc.publish({
            tenantId: 'TEST_TENANT',
            type: 'FINOPS_EVENT',
            source: 'cockpit',
            payload: { email: 'secret@pii.com', cpf: '12345678900' },
        });

        // The logger.info call should NOT contain the payload object
        const logCalls = vi.mocked(structuredLogger.info).mock.calls;
        for (const call of logCalls) {
            const meta = call[1] as Record<string, unknown>;
            expect(meta).not.toHaveProperty('payload');
            expect(meta).not.toHaveProperty('email');
            expect(meta).not.toHaveProperty('cpf');
        }
    });
});
