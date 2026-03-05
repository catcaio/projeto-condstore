/**
 * Webhook Hardening — Idempotência Persistente & Replay Protection Tests.
 *
 * Tests:
 *   - Duplicate event (webhook_events) → retorna 200 e não duplica processamento
 *   - Evento válido → insere no webhook_events e publica no Event Bus
 *   - Falha interna → status=failed
 *   - Assinatura inválida → 403/401
 *   - Replay attack (extreme clock drift) → 403
 *   - Event bus publish failure → still returns 200 (fallback síncrono)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks — hoisted ──────────────────────────────────────────────────────────

vi.mock("../../../../infra/log/logger", () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    structuredLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../../../server/twilio/verifyWebhook", () => ({
    verifyTwilioRequest: vi.fn(),
}));

vi.mock("../../../../infra/repositories/message.repository", () => ({
    messageRepository: {
        existsByMessageSid: vi.fn(),
        saveInboundMessage: vi.fn(),
    },
}));

vi.mock("../../../../infra/repositories/ai-decision-log.repository", () => ({
    aiDecisionLogRepository: {
        saveDecisionLog: vi.fn(),
    },
}));

vi.mock("../../../../infra/repositories/tenant.repository", () => ({
    tenantRepository: {
        resolveTenantByTwilioNumber: vi.fn(),
    },
}));

vi.mock("../../../../infra/repositories/attribution-click.repository", () => ({
    attributionClickRepository: {
        consumeByToken: vi.fn(),
    },
}));

vi.mock("../../../../infra/repositories/end-user-consent.repository", () => ({
    endUserConsentRepository: {
        getConsent: vi.fn(),
        recordOptIn: vi.fn(),
        revokeConsent: vi.fn(),
        incrementBlockedAttempts: vi.fn(),
    },
}));

vi.mock("../../../../infra/repositories/inbound-message-dedup.repository", () => ({
    inboundMessageDedupRepository: {
        tryAcquire: vi.fn(),
    },
}));

vi.mock("../../../../infra/repositories/webhook-event.repository", () => ({
    webhookEventRepository: {
        tryInsert: vi.fn(),
        markProcessed: vi.fn(),
        markFailed: vi.fn(),
        countFailed: vi.fn(),
    },
    hashPayload: vi.fn(() => 'sha256-mock-hash'),
}));

vi.mock("../../../../core/events/event-bus", () => ({
    publishEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../../infra/security/distributed-lock", () => ({
    acquireLock: vi.fn().mockResolvedValue({ acquired: true, token: "mock-token" }),
    releaseLock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../../modules/freight/freight.controller", () => ({
    freightController: {
        handleIncoming: vi.fn(),
    },
}));

vi.mock("../../../../core/conversation/session-manager", () => ({
    sessionManager: {
        getSession: vi.fn(),
        updateSession: vi.fn(),
    },
}));

vi.mock("../../../../lib/validation", () => ({
    sanitizeMessage: vi.fn((msg: string) => msg),
    validateWebhookPayload: vi.fn(),
}));

vi.mock("../../../../providers/twilio.provider", () => ({
    twilioProvider: {
        parseIncomingMessage: vi.fn(),
    },
}));

vi.mock("../../../../lib/phone", () => ({
    normalizeAndHash: vi.fn((n: string) => ({ normalized: n, hash: `hash-of-${n}` })),
    isValidPhone: vi.fn(() => true),
}));

vi.mock("../../../../infra/context-cache", () => ({
    appendMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../../infra/circuit-breaker", () => ({
    isCircuitOpen: vi.fn(() => false),
    recordSuccess: vi.fn(),
    recordFailure: vi.fn(),
    CIRCUIT_FALLBACK_MESSAGE: "fallback",
}));

vi.mock("../../../../infra/security/rate-limiter", () => ({
    rateLimiter: {
        limit: vi.fn(),
    },
    applyRateLimitHeaders: (response: Response) => response,
    hashRateLimitKeyForLog: vi.fn(() => "key-hash"),
}));

// ── Import mocked modules ─────────────────────────────────────────────────────

import { verifyTwilioRequest } from "../../../../server/twilio/verifyWebhook";
import { tenantRepository } from "../../../../infra/repositories/tenant.repository";
import { inboundMessageDedupRepository } from "../../../../infra/repositories/inbound-message-dedup.repository";
import { freightController } from "../../../../modules/freight/freight.controller";
import { twilioProvider } from "../../../../providers/twilio.provider";
import { rateLimiter } from "../../../../infra/security/rate-limiter";
import { webhookEventRepository } from "../../../../infra/repositories/webhook-event.repository";
import { publishEvent } from "../../../../core/events/event-bus";
import { recordFailure } from "../../../../infra/circuit-breaker";
import { messageRepository } from "../../../../infra/repositories/message.repository";
import { sessionManager } from "../../../../core/conversation/session-manager";
import { attributionClickRepository } from "../../../../infra/repositories/attribution-click.repository";
import { endUserConsentRepository } from "../../../../infra/repositories/end-user-consent.repository";
import * as distributedLock from "../../../../infra/security/distributed-lock";

// ── Import route under test ──────────────────────────────────────────────────
import { POST } from "../route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_FORM_BODY =
    "MessageSid=SM456&From=whatsapp%3A%2B5511987654321&To=whatsapp%3A%2B5511999999999&Body=oi";

function makeRequest(
    body = VALID_FORM_BODY,
    extraHeaders: Record<string, string> = {}
): NextRequest {
    const headersMap = new Map<string, string>([
        ["content-type", "application/x-www-form-urlencoded"],
        ["x-twilio-signature", "some-sig"],
        ...Object.entries(extraHeaders),
    ]);
    return {
        headers: { get: (k: string) => headersMap.get(k.toLowerCase()) ?? null },
        nextUrl: { pathname: "/api/webhook", search: "" },
        text: async () => body,
    } as unknown as NextRequest;
}

function setupHappyPath() {
    (verifyTwilioRequest as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (tenantRepository.resolveTenantByTwilioNumber as ReturnType<typeof vi.fn>)
        .mockResolvedValue({ id: "tenant-1" });
    (rateLimiter.limit as ReturnType<typeof vi.fn>).mockResolvedValue({
        allowed: true, remaining: 29, resetAt: Date.now() + 60000, limit: 30,
    });
    (webhookEventRepository.tryInsert as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (inboundMessageDedupRepository.tryAcquire as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (twilioProvider.parseIncomingMessage as ReturnType<typeof vi.fn>)
        .mockReturnValue({ messageSid: "SM456", from: "whatsapp:+5511987654321", body: "oi" });
    (freightController.handleIncoming as ReturnType<typeof vi.fn>)
        .mockResolvedValue("Olá!");
    (messageRepository.saveInboundMessage as ReturnType<typeof vi.fn>)
        .mockResolvedValue(undefined);
    (attributionClickRepository.consumeByToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (sessionManager.getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (webhookEventRepository.markProcessed as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (webhookEventRepository.markFailed as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (publishEvent as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (endUserConsentRepository.getConsent as ReturnType<typeof vi.fn>).mockResolvedValue({ consentGiven: true, consentTimestamp: new Date(), consentSource: "manual" });
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe("POST /api/webhook — webhook hardening", () => {
    const ORIG_ENV = { ...process.env };

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.TWILIO_AUTH_TOKEN = "test-token";
    });

    afterEach(() => {
        Object.keys(process.env).forEach((k) => {
            if (!(k in ORIG_ENV)) delete process.env[k];
        });
        Object.assign(process.env, ORIG_ENV);
    });

    // ── 1. Duplicate via webhook_events → 200 empty TwiML, no reprocessing ───

    it("returns 200 empty TwiML for duplicate webhook_events (persistent idempotency)", async () => {
        (verifyTwilioRequest as ReturnType<typeof vi.fn>).mockReturnValue(true);
        (webhookEventRepository.tryInsert as ReturnType<typeof vi.fn>).mockResolvedValue(false);

        const res = await POST(makeRequest());

        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toContain("text/xml");
        const text = await res.text();
        expect(text).not.toContain("<Message>");
        expect(freightController.handleIncoming).not.toHaveBeenCalled();
        expect(inboundMessageDedupRepository.tryAcquire).not.toHaveBeenCalled();
    });

    // ── 2. Valid event → inserts webhook_event + publishes to Event Bus ───────

    it("inserts webhook_event and publishes to event bus on valid request", async () => {
        setupHappyPath();

        const res = await POST(makeRequest());

        expect(res.status).toBe(200);
        expect(webhookEventRepository.tryInsert).toHaveBeenCalledWith({
            provider: 'twilio',
            eventId: 'SM456',
            eventType: 'message',
            payloadHash: 'sha256-mock-hash',
        });
        expect(webhookEventRepository.markProcessed).toHaveBeenCalledWith('twilio', 'SM456');
        expect(publishEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                stream: 'events:webhook',
                type: 'WEBHOOK_INBOUND',
                tenantId: 'tenant-1',
            }),
        );
    });

    // ── 3. Internal failure → status=failed ──────────────────────────────────

    it("marks webhook event as failed when processing throws", async () => {
        setupHappyPath();
        (freightController.handleIncoming as ReturnType<typeof vi.fn>)
            .mockRejectedValue(new Error("boom"));

        const res = await POST(makeRequest());

        expect(res.status).toBe(200); // TwiML fallback
        expect(webhookEventRepository.markFailed).toHaveBeenCalledWith('twilio', 'SM456');
        expect(recordFailure).toHaveBeenCalled();
    });

    it("returns 200 with fallback message if the distributed lock is already held", async () => {
        setupHappyPath();
        (distributedLock.acquireLock as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ acquired: false, token: "xxx" });

        const res = await POST(makeRequest());

        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("<Message>Desculpe, ocorreu um erro");
        expect(webhookEventRepository.markFailed).toHaveBeenCalledWith('twilio', 'SM456');
    });

    // ── 4. Invalid signature → 401 ──────────────────────────────────────────

    it("returns 401 for invalid Twilio signature", async () => {
        (verifyTwilioRequest as ReturnType<typeof vi.fn>).mockReturnValue(false);

        const res = await POST(makeRequest());

        expect(res.status).toBe(401);
        expect(webhookEventRepository.tryInsert).not.toHaveBeenCalled();
    });

    // ── 5. Replay attack (extreme clock drift) → 403 ─────────────────────────

    it("returns 403 when x-twilio-timestamp has extreme clock drift (>15min)", async () => {
        (verifyTwilioRequest as ReturnType<typeof vi.fn>).mockReturnValue(true);
        // 20 minutes ago in Unix seconds
        const oldTimestamp = String(Math.floor((Date.now() - 20 * 60 * 1000) / 1000));

        const res = await POST(makeRequest(VALID_FORM_BODY, {
            "x-twilio-timestamp": oldTimestamp,
        }));

        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.error.message).toMatch(/replay/i);
        expect(webhookEventRepository.tryInsert).not.toHaveBeenCalled();
    });

    it("allows request when x-twilio-timestamp is within acceptable drift", async () => {
        setupHappyPath();
        // 2 minutes ago (within 5min threshold)
        const recentTimestamp = String(Math.floor((Date.now() - 2 * 60 * 1000) / 1000));

        const res = await POST(makeRequest(VALID_FORM_BODY, {
            "x-twilio-timestamp": recentTimestamp,
        }));

        expect(res.status).toBe(200);
        expect(webhookEventRepository.tryInsert).toHaveBeenCalled();
    });

    // ── 6. Event bus publish failure → still returns 200 ─────────────────────

    it("returns 200 even when event bus publish fails (non-blocking)", async () => {
        setupHappyPath();
        (publishEvent as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Redis unavailable"));

        const res = await POST(makeRequest());

        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("<Message>");
        // Processing still completed — markProcessed should have been called
        expect(webhookEventRepository.markProcessed).toHaveBeenCalledWith('twilio', 'SM456');
    });

    // ── 7. Second delivery after first processed → no reprocessing ───────────

    it("deduplicates on webhook_events before reaching inbound dedup", async () => {
        setupHappyPath();

        // First call succeeds
        (webhookEventRepository.tryInsert as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce(true)  // first call
            .mockResolvedValueOnce(false); // second call

        const first = await POST(makeRequest());
        const second = await POST(makeRequest());

        expect(first.status).toBe(200);
        expect(second.status).toBe(200);
        expect(freightController.handleIncoming).toHaveBeenCalledTimes(1);
    });

    // ── 8. LGPD Consent Gate ──────────────────────────────────────────────────

    it("blocks ingestion and returns transactional phrase when consent is missing", async () => {
        setupHappyPath();
        (endUserConsentRepository.getConsent as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        const res = await POST(makeRequest());

        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("Para continuar, confirme que aceita nossa pol");
        expect(freightController.handleIncoming).not.toHaveBeenCalled();
        expect(messageRepository.saveInboundMessage).toHaveBeenCalledWith(expect.objectContaining({
            body: "[CONTEÚDO BLOQUEADO - AGUARDANDO CONSENTIMENTO LGPD]"
        }));
    });

    it("records opt-in when user answers 'sim' to unconsented block", async () => {
        setupHappyPath();
        (endUserConsentRepository.getConsent as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        (twilioProvider.parseIncomingMessage as ReturnType<typeof vi.fn>)
            .mockReturnValue({ messageSid: "SM456", from: "whatsapp:+5511987654321", body: "Sim" });

        const optInRequest = makeRequest(VALID_FORM_BODY.replace("Body=oi", "Body=Sim"));
        const res = await POST(optInRequest);

        expect(res.status).toBe(200);
        expect(endUserConsentRepository.recordOptIn).toHaveBeenCalled();
        expect(freightController.handleIncoming).toHaveBeenCalled();
    });
});
