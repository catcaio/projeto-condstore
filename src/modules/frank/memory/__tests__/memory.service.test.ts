import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

vi.mock('../memory.repository', () => ({
    saveMemoryEntry: vi.fn().mockResolvedValue('mock-id'),
    getRecentMessages: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/infra/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { recordInboundMessage, recordOutboundMessage, loadConversationContext } from '../memory.service';
import * as repo from '../memory.repository';

const TENANT_A = randomUUID();
const TENANT_B = randomUUID();
const SESSION_ID = 'session-abc';

describe('Frank Memory Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(repo.saveMemoryEntry).mockResolvedValue('mock-id');
        vi.mocked(repo.getRecentMessages).mockResolvedValue([]);
    });

    it('should record inbound user message', async () => {
        await recordInboundMessage(TENANT_A, SESSION_ID, 'Qual o prazo?', 'FRETE', { product: null });

        expect(repo.saveMemoryEntry).toHaveBeenCalledWith(
            expect.objectContaining({
                tenantId: TENANT_A,
                sessionId: SESSION_ID,
                role: 'user',
                message: 'Qual o prazo?',
                intent: 'FRETE',
            }),
        );
    });

    it('should record outbound assistant message', async () => {
        await recordOutboundMessage(TENANT_A, SESSION_ID, 'O prazo é 5 dias.', 'FRETE');

        expect(repo.saveMemoryEntry).toHaveBeenCalledWith(
            expect.objectContaining({
                tenantId: TENANT_A,
                sessionId: SESSION_ID,
                role: 'assistant',
                message: 'O prazo é 5 dias.',
                intent: 'FRETE',
            }),
        );
    });

    it('should record outbound operator message', async () => {
        await recordOutboundMessage(TENANT_A, SESSION_ID, 'Vou verificar.', 'PEDIDO', 'operator');

        expect(repo.saveMemoryEntry).toHaveBeenCalledWith(
            expect.objectContaining({
                role: 'operator',
            }),
        );
    });

    it('should load last 5 messages in correct order', async () => {
        const messages = [
            { id: '1', role: 'user', message: 'Oi', intent: 'SAUDACAO', timestamp: new Date('2026-03-12T10:00:00Z') },
            { id: '2', role: 'assistant', message: 'Olá!', intent: 'SAUDACAO', timestamp: new Date('2026-03-12T10:01:00Z') },
            { id: '3', role: 'user', message: 'Frete?', intent: 'FRETE', timestamp: new Date('2026-03-12T10:02:00Z') },
        ];
        vi.mocked(repo.getRecentMessages).mockResolvedValueOnce(messages);

        const ctx = await loadConversationContext(TENANT_A, SESSION_ID);

        expect(ctx.messages).toHaveLength(3);
        expect(repo.getRecentMessages).toHaveBeenCalledWith(TENANT_A, SESSION_ID, 5);
    });

    it('should return empty context on error (safe fallback)', async () => {
        vi.mocked(repo.getRecentMessages).mockRejectedValueOnce(new Error('DB down'));

        const ctx = await loadConversationContext(TENANT_A, SESSION_ID);

        expect(ctx.messages).toHaveLength(0);
    });

    it('should handle save errors without throwing (safe fallback)', async () => {
        vi.mocked(repo.saveMemoryEntry).mockRejectedValueOnce(new Error('DB down'));

        // Should not throw
        await expect(
            recordInboundMessage(TENANT_A, SESSION_ID, 'test', 'OUTRO'),
        ).resolves.toBeUndefined();
    });

    it('should isolate memory per tenant', async () => {
        const ctx = await loadConversationContext(TENANT_B, SESSION_ID);

        expect(ctx.messages).toHaveLength(0);
        expect(repo.getRecentMessages).toHaveBeenCalledWith(TENANT_B, SESSION_ID, 5);
    });
});
