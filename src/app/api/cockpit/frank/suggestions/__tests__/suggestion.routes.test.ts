import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

const mockListPendingSuggestions = vi.hoisted(() => vi.fn());
const mockGenerateSuggestion = vi.hoisted(() => vi.fn());

vi.mock('@/modules/frank/suggestions/suggestion.service', () => ({
    suggestionService: {
        listPendingSuggestions: mockListPendingSuggestions,
        generateSuggestion: mockGenerateSuggestion,
    }
}));

vi.mock('@/infra/auth/guards', () => ({
    requireAdmin: vi.fn().mockResolvedValue({
        ok: true,
        session: { tenantId: 'tenant-1' },
    }),
}));

describe('Suggestion Routes', () => {
    it('GET should return pending suggestions', async () => {
        mockListPendingSuggestions.mockResolvedValue([{ id: 'sugg-1' }]);

        const req = new NextRequest('http://localhost/api/cockpit/frank/suggestions?conversationId=conv-1');
        const res = await GET(req);
        
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.data[0].id).toBe('sugg-1');
        expect(mockListPendingSuggestions).toHaveBeenCalledWith('tenant-1', 'conv-1');
    });

    it('POST should generate suggestion', async () => {
        mockGenerateSuggestion.mockResolvedValue('new-sugg');

        const req = new NextRequest('http://localhost/api/cockpit/frank/suggestions', {
            method: 'POST',
            headers: { 'x-session-id': 'sess-1' },
            body: JSON.stringify({
                conversationId: 'conv-1',
                intent: 'test',
                suggestedResponse: 'Hello world',
                confidence: 0.95
            })
        });

        const res = await POST(req);
        
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.data.id).toBe('new-sugg');
    });
});
