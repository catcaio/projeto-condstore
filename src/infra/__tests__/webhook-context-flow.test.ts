/**
 * P1 — E2E integration test: webhook → persist → cache → context
 *
 * Proves the full pipeline without touching the network:
 *   1.  appendMessage is called (simulating what the webhook does after
 *       saveInboundMessage) and stores the message in the in-memory cache.
 *   2.  getContext hits the in-memory L1 cache (no DB roundtrip).
 *   3.  On a cold cache getContext falls back to DB and re-warms Redis.
 *   4.  Frank receives context as a system prompt.
 *
 * The RedisService in-memory fallback is intentionally NOT mocked here so we
 * can exercise the real cache code path.  To avoid cross-test contamination
 * each test uses a unique tenantId (no shared keys in the singleton store).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContextMessage } from '../context-cache';

// ── DB + AI mocks (Redis intentionally NOT mocked — we use in-memory fallback) ─

const mockDbChain = vi.hoisted(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../db', () => ({
    getDb: vi.fn().mockResolvedValue(mockDbChain),
}));

vi.mock('../logger', () => ({
    logger: { error: vi.fn(), info: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

vi.mock('../../core/ai/llm-gateway', () => ({
    getAIProviderWithMeta: vi.fn(),
}));

vi.mock('../repositories/ai-decision-log.repository', () => ({
    aiDecisionLogRepository: {
        saveDecisionLog: vi.fn().mockResolvedValue(undefined),
    },
}));

// ── Imports (after mocks) ──────────────────────────────────────────────────────

import { getContext, appendMessage } from '../context-cache';
import { redisClient } from '../redis.client';
import { FrankOrchestrator } from '../../core/ai/frank-orchestrator';
import { getAIProviderWithMeta } from '../../core/ai/llm-gateway';
import { normalizeAndHash } from '../../lib/phone';

// ── Helpers ────────────────────────────────────────────────────────────────────

// Each test gets its own unique tenant so the in-memory Redis singleton never
// has key collisions between tests.
let _testId = 0;
function freshKeys() {
    _testId++;
    const tenantId = `tenant-e2e-${_testId}`;
    const raw = `whatsapp:+5511${_testId.toString().padStart(9, '0')}`;
    const { normalized: phone, hash } = normalizeAndHash(raw);
    return { tenantId, phone, hash };
}

function makeMsg(body: string, confidence: number | null = 0.95): ContextMessage {
    return {
        body,
        direction: 'inbound',
        intent: 'FREIGHT_QUERY',
        intentConfidence: confidence,
        createdAt: new Date().toISOString(),
    };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('E2E: webhook → persist → cache append → getContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        redisClient.__resetForTests();
        mockDbChain.limit.mockResolvedValue([]);
    });

    it('context is empty before any message is appended (cold cache, empty DB)', async () => {
        const { tenantId, phone, hash } = freshKeys();
        mockDbChain.limit.mockResolvedValueOnce([]);

        const ctx = await getContext(tenantId, hash, phone, 5);
        expect(ctx).toEqual([]);
    });

    it('append → getContext returns message from L1 cache (no DB hit)', async () => {
        const { tenantId, phone, hash } = freshKeys();
        const m = makeMsg('quero calcular frete');

        // Simulate webhook: fire-and-forget after saveInboundMessage
        await appendMessage(tenantId, hash, m);

        const ctx = await getContext(tenantId, hash, phone, 5);

        expect(ctx).toHaveLength(1);
        expect(ctx[0]).toEqual(m);
        // DB must NOT have been queried (cache hit)
        expect(mockDbChain.select).not.toHaveBeenCalled();
    });

    it('getContext falls back to DB on cold cache, re-warms Redis', async () => {
        const { tenantId, phone, hash } = freshKeys();
        const dbRow = {
            body: 'mensagem anterior',
            direction: 'inbound',
            intent: 'FREIGHT_QUERY',
            intentConfidence: '0.8000',
            createdAt: new Date(Date.now() - 60_000),
        };
        mockDbChain.limit.mockResolvedValueOnce([dbRow]);

        // First call: cache cold → DB fallback
        const ctx = await getContext(tenantId, hash, phone, 5);
        expect(ctx).toHaveLength(1);
        expect(ctx[0].body).toBe('mensagem anterior');
        expect(ctx[0].intentConfidence).toBe(0.8);
        // DB was queried
        expect(mockDbChain.select).toHaveBeenCalledTimes(1);

        // Second call: cache is now warm → no additional DB hit
        vi.clearAllMocks();
        mockDbChain.limit.mockResolvedValue([]);
        const ctx2 = await getContext(tenantId, hash, phone, 5);
        expect(ctx2).toHaveLength(1);
        expect(ctx2[0].body).toBe('mensagem anterior');
        expect(mockDbChain.select).not.toHaveBeenCalled(); // cache hit
    });

    it('tenant isolation: tenant-A messages never appear for tenant-B', async () => {
        const phone = normalizeAndHash('whatsapp:+5599isolation').normalized;
        const hash = normalizeAndHash('whatsapp:+5599isolation').hash;

        // Append for tenant-A
        await appendMessage('tenant-iso-A', hash, makeMsg('msg de A'));

        // tenant-B with same phone hash: cache miss → DB (returns nothing)
        mockDbChain.limit.mockResolvedValueOnce([]);
        const ctxB = await getContext('tenant-iso-B', hash, phone, 5);

        expect(ctxB).toEqual([]);
    });

    it('intentConfidence round-trips through cache correctly', async () => {
        const { tenantId, phone, hash } = freshKeys();

        await appendMessage(tenantId, hash, makeMsg('msg com confidence', 0.75));

        const ctx = await getContext(tenantId, hash, phone, 5);
        expect(ctx[0].intentConfidence).toBe(0.75);
    });

    it('intentConfidence null round-trips correctly', async () => {
        const { tenantId, phone, hash } = freshKeys();

        await appendMessage(tenantId, hash, makeMsg('msg sem confidence', null));

        const ctx = await getContext(tenantId, hash, phone, 5);
        expect(ctx[0].intentConfidence).toBeNull();
    });

    it('Frank receives context history as system prompt', async () => {
        const { tenantId, phone, hash } = freshKeys();

        // Pre-populate cache (as if a previous message was handled by the webhook)
        await appendMessage(tenantId, hash, makeMsg('qual o prazo de entrega?', 0.85));

        const mockProvider = {
            chat: vi.fn().mockResolvedValue({ text: 'O prazo é 5 dias úteis.', raw: {} }),
            embeddings: vi.fn(),
        };
        (getAIProviderWithMeta as ReturnType<typeof vi.fn>).mockResolvedValue({
            provider: mockProvider,
            meta: { tenantId, providerType: 'openai', model: 'gpt-4', embedModel: '' },
        });

        const frank = new FrankOrchestrator();
        await frank.run({
            tenantId,
            message: 'e quanto custa o frete?',
            phoneHash: hash,
            phoneNumber: phone,
        });

        const chatCall = mockProvider.chat.mock.calls[0][0];
        // System prompt must carry the prior conversation turn
        expect(chatCall.system).toContain('qual o prazo de entrega?');
        expect(chatCall.user).toBe('e quanto custa o frete?');
    });

    it('Frank without phoneHash/phoneNumber skips context (backward compatible)', async () => {
        const { tenantId } = freshKeys();

        const mockProvider = {
            chat: vi.fn().mockResolvedValue({ text: 'Resposta.', raw: {} }),
            embeddings: vi.fn(),
        };
        (getAIProviderWithMeta as ReturnType<typeof vi.fn>).mockResolvedValue({
            provider: mockProvider,
            meta: { tenantId, providerType: 'openai', model: 'gpt-4', embedModel: '' },
        });

        const frank = new FrankOrchestrator();
        await frank.run({ tenantId, message: 'olá' });

        const chatCall = mockProvider.chat.mock.calls[0][0];
        expect(chatCall.system).toBeUndefined();
    });
});
