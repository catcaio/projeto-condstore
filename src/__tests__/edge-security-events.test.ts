import { NextRequest, NextResponse } from "next/server";
import { middleware } from "../middleware";
import * as jose from "jose";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock jose
vi.mock("jose", () => ({
    jwtVerify: vi.fn()
}));

// Mock the edge logger so we can assert it was called securely
const logEdgeSecurityEventSpy = vi.fn();
vi.mock("../lib/security/edge-logger", () => ({
    logEdgeSecurityEvent: (...args: any[]) => logEdgeSecurityEventSpy(...args)
}));

import { hashIp } from "../lib/security/edge-logger";

describe("Edge Middleware Telemetry & Security Events", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();
        (process.env as any).NODE_ENV = "test";
        process.env.AUTH_SECRET = "supersecret";
        process.env.INTERNAL_JOB_TOKEN = "valid-job-token";
    });

    function makeRequest(url: string, headers: Record<string, string>, cookies: Record<string, string> = {}) {
        const req = new NextRequest(`https://app.condstore.com${url}`);
        for (const [key, val] of Object.entries(headers)) {
            req.headers.set(key, val);
        }
        for (const [key, val] of Object.entries(cookies)) {
            req.cookies.set(key, val);
        }
        return req;
    }

    describe("Event Fire: header_spoof_detected", () => {
        it("should log telemetry when a spoofable header is injected from outside", async () => {
            const req = makeRequest("/api/internal/jobs", {
                "x-auth-role": "admin",
                "x-internal-token": "valid-job-token",
                "x-forwarded-for": "192.168.1.1",
                "x-request-id": "req-123"
            });
            const res = await middleware(req);
            expect(res.status).toBe(200); // the request itself is valid internally

            expect(logEdgeSecurityEventSpy).toHaveBeenCalledWith({
                requestId: "req-123",
                route: "/api/internal/jobs",
                reason: "header_spoof_detected",
                ip: "192.168.1.1"
            });
        });
    });

    describe("Event Fire: unauthorized_access", () => {
        it("should log telemetry for invalid internal tokens", async () => {
            const req = makeRequest("/api/internal/jobs", {
                "x-internal-token": "invalid",
                "x-forwarded-for": "10.0.0.1"
            });
            const res = await middleware(req);
            expect(res.status).toBe(401);

            expect(logEdgeSecurityEventSpy).toHaveBeenCalledWith({
                requestId: "unknown",
                route: "/api/internal/jobs",
                reason: "unauthorized_access",
                ip: "10.0.0.1"
            });
        });
    });

    describe("Event Fire: invalid_jwt", () => {
        it("should log telemetry when a cockpit JWT fails signature validation", async () => {
            (jose.jwtVerify as any).mockRejectedValue(new Error("Invalid token"));
            const req = makeRequest("/api/cockpit/settings", {
                "x-forwarded-for": "8.8.8.8"
            }, { condstore_session: "bad.jwt" });
            const res = await middleware(req);
            expect(res.status).toBe(401);

            expect(logEdgeSecurityEventSpy).toHaveBeenCalledWith({
                requestId: "unknown",
                route: "/api/cockpit/settings",
                reason: "invalid_jwt",
                ip: "8.8.8.8"
            });
        });
    });

    describe("Event Fire: tenant_mismatch", () => {
        it("should log telemetry with claims when tenant routing restricts access", async () => {
            (jose.jwtVerify as any).mockResolvedValue({
                payload: { sub: "usr_X", tenantId: "tnt_A", role: "admin" }
            });
            const req = makeRequest("/api/tenants/tnt_B/settings", {
                "x-forwarded-for": "1.1.1.1"
            }, { condstore_session: "good.jwt" });

            const res = await middleware(req);
            expect(res.status).toBe(403);

            expect(logEdgeSecurityEventSpy).toHaveBeenCalledWith({
                requestId: "unknown",
                route: "/api/tenants/tnt_B/settings",
                reason: "tenant_mismatch",
                ip: "1.1.1.1",
                tenantClaim: "tnt_A",
                userClaim: "usr_X"
            });
        });
    });
});
