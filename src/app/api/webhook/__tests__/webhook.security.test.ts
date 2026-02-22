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

vi.mock("../../../../infra/rate-limiter", () => ({
    checkRateLimit: vi.fn(),
    getThrottleMessage: vi.fn(() => "Throttled"),
}));

vi.mock("../../../../infra/repositories/message.repository", () => ({
    messageRepository: {
        existsByMessageSid: vi.fn(),
        saveInboundMessage: vi.fn(),
    },
}));

vi.mock("../../../../infra/repositories/tenant.repository", () => ({
    tenantRepository: {
        resolveTenantByTwilioNumber: vi.fn(),
    },
}));

vi.mock("../../../../modules/freight/freight.controller", () => ({
    freightController: {
        handleIncoming: vi.fn(),
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

vi.mock("../../../../lib/normalize", () => ({
    normalizeWhatsAppNumber: vi.fn((n: string) => n),
    isValidWhatsAppNumber: vi.fn(() => true),
}));

vi.mock("../../../../infra/circuit-breaker", () => ({
    isCircuitOpen: vi.fn(() => false),
    recordSuccess: vi.fn(),
    recordFailure: vi.fn(),
    CIRCUIT_FALLBACK_MESSAGE:
        "Estamos instáveis no momento. Tente novamente em instantes.",
}));

// ── Import mocked modules ─────────────────────────────────────────────────────
import { verifyTwilioRequest } from "../../../../server/twilio/verifyWebhook";
import { checkRateLimit } from "../../../../infra/rate-limiter";
import { messageRepository } from "../../../../infra/repositories/message.repository";
import { tenantRepository } from "../../../../infra/repositories/tenant.repository";
import { freightController } from "../../../../modules/freight/freight.controller";
import { twilioProvider } from "../../../../providers/twilio.provider";
import { isCircuitOpen } from "../../../../infra/circuit-breaker";

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
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
        allowed: true, remaining: 9, limit: 10,
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
        expect(body.error).toMatch(/not properly configured/i);
    });

    // ── Signature validation ──────────────────────────────────────────────────

    it("returns 401 when Twilio signature is invalid", async () => {
        (verifyTwilioRequest as ReturnType<typeof vi.fn>).mockReturnValue(false);
        const res = await POST(makeRequest());
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toMatch(/invalid signature/i);
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
        expect(body.error).toMatch(/MessageSid/i);
    });

    // ── Rate limits ───────────────────────────────────────────────────────────

    it("returns 200 TwiML and skips controller when phone rate limit exceeded", async () => {
        (verifyTwilioRequest as ReturnType<typeof vi.fn>).mockReturnValue(true);
        mockTenant();

        // Phone limit exceeded on first call
        (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            allowed: false, remaining: 0, limit: 10, retryAfterSeconds: 30,
        });

        const res = await POST(makeRequest());

        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toContain("text/xml");
        const text = await res.text();
        expect(text).toContain("<Message>");
        expect(freightController.handleIncoming).not.toHaveBeenCalled();
    });

    it("returns 200 TwiML and skips controller when tenant rate limit exceeded", async () => {
        (verifyTwilioRequest as ReturnType<typeof vi.fn>).mockReturnValue(true);
        mockTenant();

        // Phone OK, tenant exceeded
        (checkRateLimit as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce({ allowed: true, remaining: 9, limit: 10 })      // phone
            .mockResolvedValueOnce({ allowed: false, remaining: 0, limit: 200 });   // tenant

        const res = await POST(makeRequest());

        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toContain("text/xml");
        expect(freightController.handleIncoming).not.toHaveBeenCalled();
    });

    // ── Idempotency ───────────────────────────────────────────────────────────

    it("returns 200 empty TwiML for duplicate MessageSid without reprocessing", async () => {
        (verifyTwilioRequest as ReturnType<typeof vi.fn>).mockReturnValue(true);
        mockTenant();
        mockAllowedRateLimit();

        // Duplicate — already processed
        (messageRepository.existsByMessageSid as ReturnType<typeof vi.fn>)
            .mockResolvedValue(true);

        const res = await POST(makeRequest());

        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toContain("text/xml");
        const text = await res.text();
        // Empty Response — no <Message> tag
        expect(text).not.toContain("<Message>");
        expect(freightController.handleIncoming).not.toHaveBeenCalled();
    });
});
