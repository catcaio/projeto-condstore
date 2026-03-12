import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

// Use vi.hoisted to ensure mock variables are available during vi.mock hoisting
const {
    mockValues,
    mockInsert,
    mockLimit,
    mockWhere,
    mockFrom,
    mockSelectFn,
    mockSetWhere,
    mockSet,
    mockUpdate,
} = vi.hoisted(() => {
    const mockValues = vi.fn().mockResolvedValue(undefined);
    const mockInsert = vi.fn().mockReturnValue({ values: mockValues });
    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockSelectFn = vi.fn().mockReturnValue({ from: mockFrom });
    const mockSetWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet = vi.fn().mockReturnValue({ where: mockSetWhere });
    const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

    return {
        mockValues,
        mockInsert,
        mockLimit,
        mockWhere,
        mockFrom,
        mockSelectFn,
        mockSetWhere,
        mockSet,
        mockUpdate,
    };
});

vi.mock('@/infra/db', () => ({
    getDb: vi.fn().mockResolvedValue({
        insert: mockInsert,
        select: mockSelectFn,
        update: mockUpdate,
    }),
}));

vi.mock('@/lib/events/operational-event-bus', () => ({
    publishOperationalEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/infra/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { generateSuggestion, approveSuggestion } from '../suggestion.service';
import * as eventBus from '@/lib/events/operational-event-bus';

const TENANT_A = randomUUID();
const TENANT_B = randomUUID();
const SESSION_ID = 'session-xyz';

describe('Frank Suggestion Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Restore chain defaults after clearAllMocks
        mockInsert.mockReturnValue({ values: mockValues });
        mockValues.mockResolvedValue(undefined);
        mockSelectFn.mockReturnValue({ from: mockFrom });
        mockFrom.mockReturnValue({ where: mockWhere });
        mockWhere.mockReturnValue({ limit: mockLimit });
        mockLimit.mockResolvedValue([]);
        mockUpdate.mockReturnValue({ set: mockSet });
        mockSet.mockReturnValue({ where: mockSetWhere });
        mockSetWhere.mockResolvedValue(undefined);
        vi.mocked(eventBus.publishOperationalEvent).mockResolvedValue(undefined);
    });

    it('should generate suggestion and emit event', async () => {
        const id = await generateSuggestion({
            tenantId: TENANT_A,
            sessionId: SESSION_ID,
            suggestedResponse: 'Seu pedido está em trânsito.',
            confidence: 0.85,
            source: 'playbook',
        });

        expect(typeof id).toBe('string');
        expect(id.length).toBe(36);
        expect(mockInsert).toHaveBeenCalled();

        expect(eventBus.publishOperationalEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                tenantId: TENANT_A,
                eventType: 'frank_suggestion_generated',
                sessionId: SESSION_ID,
                payload: expect.objectContaining({
                    source: 'playbook',
                    confidence: 0.85,
                }),
            }),
        );
    });

    it('should generate knowledge-sourced suggestion', async () => {
        const id = await generateSuggestion({
            tenantId: TENANT_A,
            sessionId: SESSION_ID,
            suggestedResponse: 'Based on KB article.',
            confidence: 0.72,
            source: 'knowledge',
        });

        expect(typeof id).toBe('string');
        expect(eventBus.publishOperationalEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: expect.objectContaining({ source: 'knowledge' }),
            }),
        );
    });

    it('should approve suggestion and emit frank_suggestion_approved event', async () => {
        const suggestionId = randomUUID();

        // Mock select to return an existing suggestion
        mockLimit.mockResolvedValueOnce([{
            id: suggestionId,
            tenantId: TENANT_A,
            sessionId: SESSION_ID,
            suggestedResponse: 'Test',
            confidence: '0.8000',
            source: 'tool',
            approved: false,
            createdAt: new Date(),
        }]);

        const result = await approveSuggestion(TENANT_A, suggestionId);

        expect(result).toBe(true);
        expect(eventBus.publishOperationalEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                tenantId: TENANT_A,
                eventType: 'frank_suggestion_approved',
                entityId: suggestionId,
            }),
        );
    });

    it('should return false when approving non-existent suggestion (tenant isolation)', async () => {
        mockLimit.mockResolvedValueOnce([]);

        const result = await approveSuggestion(TENANT_B, randomUUID());

        expect(result).toBe(false);
        expect(eventBus.publishOperationalEvent).not.toHaveBeenCalled();
    });
});
