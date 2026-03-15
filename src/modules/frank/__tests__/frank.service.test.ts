import { describe, it, expect, vi, beforeEach } from 'vitest';
import { frankService } from '../frank.service';
import { frankContextBuilder } from '../frank.context-builder';
import { frankSuggestions } from '../frank.suggestions';
import { logger } from '@/infra/logger';

vi.mock('../frank.context-builder', () => ({
    frankContextBuilder: {
        buildContext: vi.fn(),
    },
}));

vi.mock('../frank.suggestions', () => ({
    frankSuggestions: {
        generateSuggestions: vi.fn(),
    },
}));

vi.mock('@/infra/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

describe('Frank Service Copilot Orchestrator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should securely proxy requests to llm and return suggestions', async () => {
        const mockContext = {
            conversation: { id: 'conv-123', stage: 'NEW_LEAD', messages: [] },
            customer: null,
            pipeline: { recentQuotes: [], recentOrders: [] },
            operacional: { ownerId: null, openTasks: 0, recentNotes: 0 }
        };

        const mockSuggestion = {
            summary: 'Client asked about pricing.',
            suggestedReply: 'Here is the pricing...',
            suggestedAction: 'CREATE_QUOTE' as const,
            insights: ['Client is a new lead']
        };

        vi.mocked(frankContextBuilder.buildContext).mockResolvedValue(mockContext);
        vi.mocked(frankSuggestions.generateSuggestions).mockResolvedValue(mockSuggestion);

        const result = await frankService.generateCopilotSuggestions('tenant1', 'conv-123', 'op-456');

        expect(frankContextBuilder.buildContext).toHaveBeenCalledWith('tenant1', 'conv-123');
        expect(frankSuggestions.generateSuggestions).toHaveBeenCalledWith(mockContext);
        expect(result).toEqual(mockSuggestion);
        expect(logger.info).toHaveBeenCalledWith(
            'Frank Passive Copilot success',
            expect.objectContaining({ tenantId: 'tenant1', conversationId: 'conv-123' })
        );
    });

    it('should catch errors and return a safe fallback without crashing', async () => {
        vi.mocked(frankContextBuilder.buildContext).mockRejectedValue(new Error('Database Timeout'));

        const result = await frankService.generateCopilotSuggestions('tenant2', 'conv-invalid', 'op-456');

        expect(result).toEqual(expect.objectContaining({
            summary: "Falha técnica ao tentar ler o contexto da conversa.",
            suggestedAction: "NONE"
        }));

        expect(logger.error).toHaveBeenCalled();
    });
});
