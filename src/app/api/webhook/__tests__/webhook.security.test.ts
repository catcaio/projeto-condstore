/**
 * Webhook security hardening tests.
 *
 * Tests the guard layers in POST /api/webhook:
 *   - Missing TWILIO_AUTH_TOKEN → 500
 *   - Signature invalid → 401
 *   - Signature valid → 200
 *   - Circuit breaker open → 200 TwiML fallback
 *   - Missing MessageSid → 400
 *   - Rate limit: phone exceeded → 200 TwiML
 *   - Rate limit: tenant exceeded → 200 TwiML
 *   - Duplicate MessageSid → 200 empty TwiML (no reprocessing)
 *
 * Test file is at: src/app/api/webhook/__tests__/
 * Paths go UP 4 levels to reach src/
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks — must be hoisted before importing route ───────────────────────────

vi.mock("../../../../server/twilio/verifyWebhook", () => ({
    verifyTwilioRequest: vi.fn(),
}));

vi.mock("../../../../infra/rate-limit/redis-rate-limiter", () => ({
    checkRedisRateLimit: vi.fn(),
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

vi.mock("../../../../infra/repositories/inbound-message-dedup.repository", () => ({
    inboundMessageDedupRepository: {
        tryAcquire: vi.fn(),
    },
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
    CIRCUIT_FALLBACK_MESSAGE:
        "Estamos instáveis no momento. Tente novamente em instantes.",
}));

vi.mock("../../../../infra/security/rate-limiter", () => ({
    rateLimiter: {
        limit: vi.fn(),
    },
    applyRateLimitHeaders: (response: Response, decision: { limit: number; remaining: number; resetAt: number }) => {
        response.headers.set("x-ratelimit-limit", String(decision.limit));
        response.headers.set("x-ratelimit-remaining", String(decision.remaining));
        response.headers.set("x-ratelimit-reset", String(decision.resetAt));
        return response;
    },
    hashRateLimitKeyForLog: vi.fn(() => "twilio-key-hash"),
}));

// ── Import mocked modules ─────────────────────────────────────────────────────
import { verifyTwilioRequest } from "../../../../server/twilio/verifyWebhook";
import { checkRedisRateLimit } from "../../../../infra/rate-limit/redis-rate-limiter";
import { messageRepository } from "../../../../infra/repositories/message.repository";
import { aiDecisionLogRepository } from "../../../../infra/repositories/ai-decision-log.repository";
import { tenantRepository } from "../../../../infra/repositories/tenant.repository";
import { attributionClickRepository } from "../../../../infra/repositories/attribution-click.repository";
import { inboundMessageDedupRepository } from "../../../../infra/repositories/inbound-message-dedup.repository";
import { freightController } from "../../../../modules/freight/freight.controller";
import { twilioProvider } from "../../../../providers/twilio.provider";
import { isCircuitOpen } from "../../../../infra/circuit-breaker";
import { sessionManager } from "../../../../core/conversation/session-manager";
import { rateLimiter } from "../../../../infra/security/rate-limiter";

// ── Import route under test (after all mocks are hoisted) ────────────────────
import { POST } from "../route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_FORM_BODY =
    "MessageSid=SM123&From=whatsapp%3A%2B5511987654321&To=whatsapp%3A%2B5511999999999&Body=oi";

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

function mockTenant() {
    (tenantRepository.resolveTenantByTwilioNumber as ReturnType<typeof vi.fn>)
        .mockResolvedValue({ id: "tenant-1" });
}

function mockAllowedRateLimit() {
    (checkRedisRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
        allowed: true, remaining: 9, resetAt: Date.now() + 60000,
    });
    (rateLimiter.limit as ReturnType<typeof vi.fn>).mockResolvedValue({
        allowed: true, remaining: 29, resetAt: Date.now() + 60000, limit: 30,
    });
}

function mockNotDuplicate() {
    (messageRepository.existsByMessageSid as ReturnType<typeof vi.fn>)
        .mockResolvedValue(false);
}

function mockHappyPath(reply = "Olá! Qual CEP de destino?") {
    (freightController.handleIncoming as ReturnType<typeof vi.fn>)
        .mockResolvedValue(reply);
    (twilioProvider.parseIncomingMessage as ReturnType<typeof vi.fn>)
        .mockReturnValue({ messageSid: "SM123", from: "whatsapp:+5511987654321", body: "oi" });
    (messageRepository.saveInboundMessage as ReturnType<typeof vi.fn>)
        .mockResolvedValue(undefined);
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe("POST /api/webhook — security hardening", () => {
    const ORIG_ENV = { ...process.env };

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.TWILIO_AUTH_TOKEN = "test-token-abc";
        (isCircuitOpen as ReturnType<typeof vi.fn>).mockReturnValue(false);
        (attributionClickRepository.consumeByToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        (inboundMessageDedupRepository.tryAcquire as ReturnType<typeof vi.fn>).mockResolvedValue(true);
        (rateLimiter.limit as ReturnType<typeof vi.fn>).mockResolvedValue({
            allowed: true, remaining: 29, resetAt: Date.now() + 60000, limit: 30,
        });
        (sessionManager.getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        (sessionManager.updateSession as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    });

    afterEach(() => {
        Object.keys(process.env).forEach((k) => {
            if (!(k in ORIG_ENV)) delete process.env[k];
        });
        Object.assign(process.env, ORIG_ENV);
    });

    // ── Token configuration ───────────────────────────────────────────────────

    it("returns 500 when TWILIO_AUTH_TOKEN is not set", async () => {
        delete process.env.TWILIO_AUTH_TOKEN;
        const res = await POST(makeRequest());
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.error.message).toMatch(/not properly configured/i);
    });

    // ── Signature validation ──────────────────────────────────────────────────

    it("returns 401 when Twilio signature is invalid", async () => {
        (verifyTwilioRequest as ReturnType<typeof vi.fn>).mockReturnValue(false);
        const res = await POST(makeRequest());
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error.message).toMatch(/invalid signature/i);
    });

    it("returns 200 TwiML when signature is valid (happy path)", async () => {
        (verifyTwilioRequest as ReturnType<typeof vi.fn>).mockReturnValue(true);
        mockTenant();
        mockAllowedRateLimit();
        mockNotDuplicate();
        mockHappyPath();

        const res = await POST(makeRequest());

        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toContain("text/xml");
        const text = await res.text();
        expect(text).toContain("<Message>");
    });

    // ── Circuit breaker ───────────────────────────────────────────────────────

    it("returns 200 TwiML with fallback message when circuit breaker is OPEN", async () => {
        (verifyTwilioRequest as ReturnType<typeof vi.fn>).mockReturnValue(true);
        (isCircuitOpen as ReturnType<typeof vi.fn>).mockReturnValue(true);

        const res = await POST(makeRequest());

        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toContain("text/xml");
        const text = await res.text();
        expect(text).toContain("instáveis");
        // Downstream must NOT be called
        expect(freightController.handleIncoming).not.toHaveBeenCalled();
    });

    // ── Payload validation ────────────────────────────────────────────────────

    it("returns 400 when MessageSid is missing", async () => {
        (verifyTwilioRequest as ReturnType<typeof vi.fn>).mockReturnValue(true);
        const noSid = "From=whatsapp%3A%2B5511987654321&To=whatsapp%3A%2B5599&Body=oi";
        const res = await POST(makeRequest(noSid));

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error.message).toMatch(/MessageSid/i);
    });

    // ── Rate limits ───────────────────────────────────────────────────────────

    it("returns 429 and skips controller when phone rate limit exceeded", async () => {
        (verifyTwilioRequest as ReturnType<typeof vi.fn>).mockReturnValue(true);
        mockTenant();
        (rateLimiter.limit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            allowed: false, remaining: 0, resetAt: Date.now() + 30000, limit: 30,
        });

        const res = await POST(makeRequest());
        const body = await res.json();

        expect(res.status).toBe(429);
        expect(res.headers.get("x-ratelimit-limit")).toBe("30");
        expect(res.headers.get("x-ratelimit-remaining")).toBe("0");
        expect(body).toMatchObject({ ok: false, error: { code: "RATE_LIMITED" } });
        expect(freightController.handleIncoming).not.toHaveBeenCalled();
    });

    it("returns 429 with rate-limit headers and JSON body when twilio limiter blocks", async () => {
        (verifyTwilioRequest as ReturnType<typeof vi.fn>).mockReturnValue(true);
        mockTenant();
        (rateLimiter.limit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            allowed: false, remaining: 0, resetAt: Date.now() + 3600000, limit: 30,
        });

        const res = await POST(makeRequest());
        const body = await res.json();

        expect(res.status).toBe(429);
        expect(res.headers.get("x-ratelimit-limit")).toBe("30");
        expect(body).toMatchObject({ ok: false, error: { code: "RATE_LIMITED" } });
        expect(freightController.handleIncoming).not.toHaveBeenCalled();
    });

    // ── Idempotency ───────────────────────────────────────────────────────────

    it("returns 200 empty TwiML for duplicate MessageSid without reprocessing", async () => {
        (verifyTwilioRequest as ReturnType<typeof vi.fn>).mockReturnValue(true);
        mockTenant();
        mockAllowedRateLimit();
        (inboundMessageDedupRepository.tryAcquire as ReturnType<typeof vi.fn>).mockResolvedValue(false);

        const res = await POST(makeRequest());

        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toContain("text/xml");
        const text = await res.text();
        // Empty Response — no <Message> tag
        expect(text).not.toContain("<Message>");
        expect(freightController.handleIncoming).not.toHaveBeenCalled();
    });

    it("processes MessageSid once and no-ops duplicate replay on second delivery", async () => {
        (verifyTwilioRequest as ReturnType<typeof vi.fn>).mockReturnValue(true);
        mockTenant();
        mockAllowedRateLimit();
        mockNotDuplicate();
        mockHappyPath("ok");

        (inboundMessageDedupRepository.tryAcquire as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(false);

        const first = await POST(makeRequest());
        const second = await POST(makeRequest());

        expect(first.status).toBe(200);
        expect(second.status).toBe(200);
        expect(messageRepository.saveInboundMessage).toHaveBeenCalledTimes(1);
        expect(freightController.handleIncoming).toHaveBeenCalledTimes(1);
    });

    it("persists intent PROVIDE_CEP for CEP body", async () => {
        (verifyTwilioRequest as ReturnType<typeof vi.fn>).mockReturnValue(true);
        mockTenant();
        mockAllowedRateLimit();
        mockNotDuplicate();

        (twilioProvider.parseIncomingMessage as ReturnType<typeof vi.fn>)
            .mockReturnValue({ messageSid: "SM123", from: "whatsapp:+5511987654321", body: "12345-678" });
        (freightController.handleIncoming as ReturnType<typeof vi.fn>)
            .mockResolvedValue("ok");
        (messageRepository.saveInboundMessage as ReturnType<typeof vi.fn>)
            .mockResolvedValue(undefined);

        const res = await POST(makeRequest("MessageSid=SM123&From=whatsapp%3A%2B5511987654321&To=whatsapp%3A%2B5511999999999&Body=12345-678"));

        expect(res.status).toBe(200);
        expect(messageRepository.saveInboundMessage).toHaveBeenCalledWith(
            expect.objectContaining({ intent: "PROVIDE_CEP" })
        );
        expect(aiDecisionLogRepository.saveDecisionLog).toHaveBeenCalledTimes(1);
    });

    it("persists intent FREIGHT_QUERY for freight request body", async () => {
        (verifyTwilioRequest as ReturnType<typeof vi.fn>).mockReturnValue(true);
        mockTenant();
        mockAllowedRateLimit();
        mockNotDuplicate();

        (twilioProvider.parseIncomingMessage as ReturnType<typeof vi.fn>)
            .mockReturnValue({ messageSid: "SM123", from: "whatsapp:+5511987654321", body: "quero calcular frete" });
        (freightController.handleIncoming as ReturnType<typeof vi.fn>)
            .mockResolvedValue("ok");
        (messageRepository.saveInboundMessage as ReturnType<typeof vi.fn>)
            .mockResolvedValue(undefined);

        const res = await POST(makeRequest("MessageSid=SM123&From=whatsapp%3A%2B5511987654321&To=whatsapp%3A%2B5511999999999&Body=quero+calcular+frete"));

        expect(res.status).toBe(200);
        expect(messageRepository.saveInboundMessage).toHaveBeenCalledWith(
            expect.objectContaining({ intent: "FREIGHT_QUERY" })
        );
        expect(aiDecisionLogRepository.saveDecisionLog).toHaveBeenCalledTimes(1);
    });

    it("extracts attribution token and stores session attribution when token is found in body", async () => {
        (verifyTwilioRequest as ReturnType<typeof vi.fn>).mockReturnValue(true);
        mockTenant();
        mockAllowedRateLimit();
        mockNotDuplicate();
        mockHappyPath();

        (twilioProvider.parseIncomingMessage as ReturnType<typeof vi.fn>)
            .mockReturnValue({ messageSid: "SM123", from: "whatsapp:+5511987654321", body: "quero frete #t=ref_123" });

        (attributionClickRepository.consumeByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
            row: { token: "ref_123" },
            attribution: {
                utmSource: "google",
                utmCampaign: "camp-1",
                refToken: "ref_123",
                clickId: "gclid-xyz",
            },
        });

        (sessionManager.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
            sessionId: "s1",
            tenantId: "tenant-1",
            phoneNumber: "whatsapp:+5511987654321",
            currentState: "IDLE",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            expiresAt: Date.now() + 1000,
        });

        const res = await POST(makeRequest("MessageSid=SM123&From=whatsapp%3A%2B5511987654321&To=whatsapp%3A%2B5511999999999&Body=quero+frete+%23t%3Dref_123"));

        expect(res.status).toBe(200);
        expect(attributionClickRepository.consumeByToken).toHaveBeenCalledWith(
            "ref_123",
            expect.objectContaining({ requestId: expect.any(String), tenantId: "tenant-1" }),
        );
        expect(sessionManager.updateSession).toHaveBeenCalledWith(
            "tenant-1",
            "whatsapp:+5511987654321",
            expect.objectContaining({
                attribution: expect.objectContaining({
                    utmSource: "google",
                    utmCampaign: "camp-1",
                    refToken: "ref_123",
                }),
            }),
        );
        expect(freightController.handleIncoming).toHaveBeenCalledWith(
            "tenant-1",
            "whatsapp:+5511987654321",
            "quero frete #t=ref_123",
            "SM123",
            expect.objectContaining({ refToken: "ref_123" }),
            expect.any(String),
        );
    });
});
