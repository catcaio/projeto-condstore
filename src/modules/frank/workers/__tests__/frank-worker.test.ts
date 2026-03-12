import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

// Use vi.hoisted to ensure mock variables are available during vi.mock hoisting
const {
    mockPendingRows,
    mockInsertValues,
    mockSetWhere,
    mockSetFn,
    mockLimit,
    mockOrderBy,
    mockWhereFn,
    mockFromFn,
    mockSelect,
} = vi.hoisted(() => {
    const mockInsertValues = vi.fn().mockResolvedValue(undefined);
    const mockSetWhere = vi.fn().mockResolvedValue(undefined);
    const mockSetFn = vi.fn().mockReturnValue({ where: mockSetWhere });
    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockWhereFn = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockFromFn = vi.fn().mockReturnValue({ where: mockWhereFn });
    const mockSelect = vi.fn().mockReturnValue({ from: mockFromFn });

    return {
        mockPendingRows: [] as unknown[],
        mockInsertValues,
        mockSetWhere,
        mockSetFn,
        mockLimit,
        mockOrderBy,
        mockWhereFn,
        mockFromFn,
        mockSelect,
    };
});

// Mock orchestrator
vi.mock('../../whatsapp-orchestrator', () => ({
    handleIncomingMessage: vi.fn().mockResolvedValue({
        reply: 'Test reply',
        intent: 'SAUDACAO',
        intentConfidence: 0.95,
        cep: null,
        productRef: null,
        simulationId: null,
        carrierSuggested: null,
        context: null,
    }),
}));

vi.mock('@/config/app.config', () => ({
    appConfig: { frank: { runtimeEnabled: true } },
    isFrankRuntimeEnabled: vi.fn().mockReturnValue(true),
}));

// Mock Twilio
vi.mock('@/providers/twilio.provider', () => ({
    twilioProvider: {
        sendMessage: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('@/infra/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/infra/db', () => ({
    getDb: vi.fn().mockResolvedValue({
        select: mockSelect,
        insert: vi.fn().mockReturnValue({ values: mockInsertValues }),
        update: vi.fn().mockReturnValue({ set: mockSetFn }),
    }),
}));

import { processMessageBatch, enqueueIncomingMessage } from '../frank-worker';

const TENANT_A = randomUUID();

describe('Frank Async Worker', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPendingRows.length = 0;
        mockLimit.mockImplementation(() => Promise.resolve([...mockPendingRows]));
        mockSetFn.mockReturnValue({ where: mockSetWhere });
        mockSetWhere.mockResolvedValue(undefined);
        mockSelect.mockReturnValue({ from: mockFromFn });
        mockFromFn.mockReturnValue({ where: mockWhereFn });
        mockWhereFn.mockReturnValue({ orderBy: mockOrderBy });
        mockOrderBy.mockReturnValue({ limit: mockLimit });
    });

    it('should return zero when no unprocessed messages exist', async () => {
        const result = await processMessageBatch();
        expect(result.processed).toBe(0);
        expect(result.errors).toBe(0);
    });

    it('should process unprocessed messages and call orchestrator', async () => {
        mockPendingRows.push({
            id: randomUUID(),
            tenantId: TENANT_A,
            sessionId: 'session-1',
            message: 'Olá',
            phone: '+5511999999999',
            twilioPayload: null,
            timestamp: new Date(),
            processed: false,
            processedAt: null,
        });

        const result = await processMessageBatch();
        expect(result.processed).toBe(1);
        expect(result.errors).toBe(0);
    });

    it('should enqueue a new message for async processing', async () => {
        const id = await enqueueIncomingMessage({
            tenantId: TENANT_A,
            sessionId: 'session-2',
            message: 'Quero calcular frete',
            phone: '+5511888888888',
        });

        expect(typeof id).toBe('string');
        expect(id.length).toBe(36);
        expect(mockInsertValues).toHaveBeenCalled();
    });

    it('should handle orchestrator errors gracefully', async () => {
        const { handleIncomingMessage } = await import('../../whatsapp-orchestrator');
        vi.mocked(handleIncomingMessage).mockRejectedValueOnce(new Error('Orchestrator failure'));

        mockPendingRows.push({
            id: randomUUID(),
            tenantId: TENANT_A,
            sessionId: 'session-3',
            message: 'Test error',
            phone: '+5511777777777',
            twilioPayload: null,
            timestamp: new Date(),
            processed: false,
            processedAt: null,
        });

        const result = await processMessageBatch();
        expect(result.errors).toBe(1);
        expect(result.processed).toBe(0);
    });
});
