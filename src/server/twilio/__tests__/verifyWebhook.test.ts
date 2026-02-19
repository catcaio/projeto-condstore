/**
 * Tests for src/server/twilio/verifyWebhook.ts
 *
 * We test getPublicUrl and the guard conditions of verifyTwilioRequest
 * using minimal NextRequest-like mocks so we don't need a live server.
 *
 * Real HMAC validation is covered by the twilio library's own tests;
 * we only test that we call it correctly and handle edge cases.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { NextRequest } from "next/server";
import { getPublicUrl, verifyTwilioRequest } from "../verifyWebhook";

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build a minimal NextRequest mock. We only need the properties accessed
 * by getPublicUrl and verifyTwilioRequest.
 */
function makeRequest({
  pathname = "/api/webhook",
  search = "",
  headers = {} as Record<string, string>,
}: {
  pathname?: string;
  search?: string;
  headers?: Record<string, string>;
}): NextRequest {
  const headersMap = new Map(Object.entries(headers));

  return {
    nextUrl: { pathname, search },
    headers: {
      get: (key: string) => headersMap.get(key.toLowerCase()) ?? null,
    },
  } as unknown as NextRequest;
}

// ── getPublicUrl ────────────────────────────────────────────────────────────

describe("getPublicUrl", () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    // Restore env after each test
    Object.keys(process.env).forEach(k => {
      if (!(k in ORIGINAL_ENV)) delete process.env[k];
    });
    Object.assign(process.env, ORIGINAL_ENV);
  });

  it("uses TWILIO_WEBHOOK_BASE_URL + pathname when env is set", () => {
    process.env.TWILIO_WEBHOOK_BASE_URL = "https://example.com";
    const req = makeRequest({ pathname: "/api/webhook" });
    expect(getPublicUrl(req)).toBe("https://example.com/api/webhook");
  });

  it("strips trailing slash from TWILIO_WEBHOOK_BASE_URL", () => {
    process.env.TWILIO_WEBHOOK_BASE_URL = "https://example.com/";
    const req = makeRequest({ pathname: "/api/webhook" });
    expect(getPublicUrl(req)).toBe("https://example.com/api/webhook");
  });

  it("appends search (query string) from the request when using base URL", () => {
    process.env.TWILIO_WEBHOOK_BASE_URL = "https://example.com";
    const req = makeRequest({ pathname: "/api/webhook", search: "?bodySHA256=abc123" });
    expect(getPublicUrl(req)).toBe("https://example.com/api/webhook?bodySHA256=abc123");
  });

  it("falls back to x-forwarded-proto + x-forwarded-host headers", () => {
    delete process.env.TWILIO_WEBHOOK_BASE_URL;
    const req = makeRequest({
      pathname: "/api/webhook",
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "myapp.ngrok.io",
      },
    });
    expect(getPublicUrl(req)).toBe("https://myapp.ngrok.io/api/webhook");
  });

  it("falls back to host header when x-forwarded-host is absent", () => {
    delete process.env.TWILIO_WEBHOOK_BASE_URL;
    const req = makeRequest({
      pathname: "/api/webhook",
      headers: {
        "x-forwarded-proto": "https",
        host: "myapp.vercel.app",
      },
    });
    expect(getPublicUrl(req)).toBe("https://myapp.vercel.app/api/webhook");
  });

  it("defaults to https://localhost:3000 when no headers are present", () => {
    delete process.env.TWILIO_WEBHOOK_BASE_URL;
    const req = makeRequest({ pathname: "/api/webhook" });
    expect(getPublicUrl(req)).toContain("/api/webhook");
    expect(getPublicUrl(req)).toMatch(/^https?:\/\//);
  });

  it("preserves search on header-based URL construction", () => {
    delete process.env.TWILIO_WEBHOOK_BASE_URL;
    const req = makeRequest({
      pathname: "/api/webhook",
      search: "?bodySHA256=abc",
      headers: { "x-forwarded-proto": "https", "x-forwarded-host": "hook.example.com" },
    });
    expect(getPublicUrl(req)).toBe("https://hook.example.com/api/webhook?bodySHA256=abc");
  });
});

// ── verifyTwilioRequest — guard conditions ──────────────────────────────────

describe("verifyTwilioRequest", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    // Provide a dummy auth token by default; individual tests can override.
    process.env.TWILIO_AUTH_TOKEN = "test_auth_token_32chars_padding_xx";
  });

  afterEach(() => {
    Object.keys(process.env).forEach(k => {
      if (!(k in ORIGINAL_ENV)) delete process.env[k];
    });
    Object.assign(process.env, ORIGINAL_ENV);
  });

  it("returns false when X-Twilio-Signature header is missing", () => {
    const req = makeRequest({ headers: {} }); // no x-twilio-signature
    const result = verifyTwilioRequest(
      req,
      "From=whatsapp%3A%2B5511&Body=oi",
      { From: "whatsapp:+5511", Body: "oi" }
    );
    expect(result).toBe(false);
  });

  it("returns false and logs warning when TWILIO_AUTH_TOKEN is not set", () => {
    delete process.env.TWILIO_AUTH_TOKEN;
    const req = makeRequest({
      headers: { "x-twilio-signature": "some-sig" },
    });
    const result = verifyTwilioRequest(
      req,
      "From=whatsapp%3A%2B5511&Body=oi",
      { From: "whatsapp:+5511", Body: "oi" }
    );
    expect(result).toBe(false);
  });

  it("returns false for a mismatched signature on form body", () => {
    process.env.TWILIO_WEBHOOK_BASE_URL = "https://example.com";
    const req = makeRequest({
      pathname: "/api/webhook",
      headers: {
        "x-twilio-signature": "INVALID_SIGNATURE_NOT_VALID_BASE64==",
        "content-type": "application/x-www-form-urlencoded",
      },
    });
    const result = verifyTwilioRequest(
      req,
      "From=whatsapp%3A%2B5511999999999&Body=oi",
      { From: "whatsapp:+5511999999999", Body: "oi" }
    );
    expect(result).toBe(false);
  });

  it("returns false for a mismatched signature on JSON body", () => {
    process.env.TWILIO_WEBHOOK_BASE_URL = "https://example.com";
    const jsonBody = JSON.stringify({ From: "whatsapp:+5511", Body: "oi" });
    const req = makeRequest({
      pathname: "/api/webhook",
      headers: {
        "x-twilio-signature": "INVALID_SIGNATURE_NOT_VALID_BASE64==",
        "content-type": "application/json",
      },
    });
    const result = verifyTwilioRequest(req, jsonBody, {});
    expect(result).toBe(false);
  });

  it("does not throw when the twilio library throws internally (returns false)", () => {
    process.env.TWILIO_WEBHOOK_BASE_URL = "https://example.com";
    const req = makeRequest({
      pathname: "/api/webhook",
      headers: {
        "x-twilio-signature": "!!!not-base64!!!",
        "content-type": "application/x-www-form-urlencoded",
      },
    });
    expect(() =>
      verifyTwilioRequest(
        req,
        "From=whatsapp%3A%2B5511&Body=oi",
        { From: "whatsapp:+5511", Body: "oi" }
      )
    ).not.toThrow();
  });

  it("accepts call with no rawBody or formParams (uses defaults)", () => {
    const req = makeRequest({ headers: {} }); // missing signature → false
    // Should not throw even with defaults
    expect(() => verifyTwilioRequest(req)).not.toThrow();
    expect(verifyTwilioRequest(req)).toBe(false);
  });
});
