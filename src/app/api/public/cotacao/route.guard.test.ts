import { NextRequest } from 'next/server';
import { POST } from './intent/route';
import { publicEventsRepository } from '@/infra/repositories/public-events.repository';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rateLimiter } from '@/infra/security/rate-limiter';

vi.mock('@/infra/security/rate-limiter', () => ({
    applyRateLimitHeaders: vi.fn((res) => res),
    hashRateLimitKeyForLog: vi.fn(),
    rateLimiter: {
        limit: vi.fn(),
    }
}));

vi.mock('@/infra/repositories/public-events.repository', () => ({
    publicEventsRepository: {
        create: vi.fn(),
    }
}));

vi.mock('@/infra/repositories/attribution-click.repository', () => ({
    attributionClickRepository: {
        getByToken: vi.fn().mockResolvedValue(null),
        upsertByToken: vi.fn(),
    }
}));

vi.mock('@/infra/log/logger');

describe('LGPD Public Guard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(rateLimiter.limit).mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 1000, limit: 10 } as any);
    });

    it('should not persist PII data (email, nome, telefone) in publicEvents under any circumstance', async () => {
        const maliciousPayload = {
            originCep: '12345678',
            destinationCep: '87654321',
            weightInKg: 2,
            packageType: 'box',
            clientTs: Date.now(),
            email: 'hacker@verysus.com',
            nome: 'Hacker da Silva',
            telefone: '+5511999999999',
            utmSource: 'organic'
        };

        const req = new NextRequest('http://localhost/api/public/cotacao/intent', {
            method: 'POST',
            body: JSON.stringify(maliciousPayload)
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        // Verifica oq foi chamado no repositório fake
        expect(publicEventsRepository.create).toHaveBeenCalledTimes(1);

        const capturedEvent = vi.mocked(publicEventsRepository.create).mock.calls[0][0];

        // Certifica que existe um payload
        expect(capturedEvent.payloadJson).toBeDefined();

        // Verifica vazamentos
        expect((capturedEvent.payloadJson as any).email).toBeUndefined();
        expect((capturedEvent.payloadJson as any).nome).toBeUndefined();
        expect((capturedEvent.payloadJson as any).telefone).toBeUndefined();

        // Verifica que apenas o permitido passou
        expect(capturedEvent.payloadJson).toMatchObject({
            originCep: '12345678',
            destinationCep: '87654321',
            weightInKg: 2,
            packageType: 'box',
            utmSource: 'organic'
        });
    });
});
