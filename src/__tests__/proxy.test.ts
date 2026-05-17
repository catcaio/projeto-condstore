import { NextRequest, NextResponse } from "next/server";
import { middleware } from "../middleware";
import * as jose from "jose";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { safeCompare } from "../lib/security/safe-compare";

vi.mock("jose", () => ({
    jwtVerify: vi.fn()
}));

vi.mock("../lib/security/safe-compare", () => ({
    safeCompare: vi.fn((a, b) => a === b && a !== undefined && a !== null)
}));

describe("Global Edge Middleware Enforcement", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();
        (process.env as any).NODE_ENV = "test";
        process.env.AUTH_SECRET = "supersecret";
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

    describe("General Header Stripping", () => {
        it("should strip spoofable headers before passing to next", async () => {
            const req = makeRequest("/api/internal/test", {
                "x-tenant-id": "spoofed",
                "x-auth-tenant-id": "spoofed",
                "x-auth-role": "admin",
                "x-auth-user-id": "hacked",
                "x-auth-email": "hacker@test.com",
                "x-internal-token": "valid"
            });
            process.env.INTERNAL_TOKEN = "valid";

            const nextSpy = vi.spyOn(NextResponse, "next").mockImplementation((args: any) => {
                const h = args?.request?.headers as Headers;
                expect(h.get("x-tenant-id")).toBeNull();
                expect(h.get("x-auth-tenant-id")).toBeNull();
                expect(h.get("x-auth-role")).toBeNull();
                expect(h.get("x-auth-user-id")).toBeNull();
                expect(h.get("x-auth-email")).toBeNull();
                return new NextResponse();
            });

            const res = await middleware(req);
            expect(nextSpy).toHaveBeenCalled();
            nextSpy.mockRestore();
        });
    });

    describe("RULE 1: /api/internal/*", () => {
        it("should block if no internal token is provided", async () => {
            const req = makeRequest("/api/internal/jobs", {});
            const res = await middleware(req);
            expect(res.status).toBe(401);
            expect(await res.json()).toEqual({ error: "Unauthorized internal access" });
        });

        it("should parse token from x-internal-token and allow if valid", async () => {
            process.env.INTERNAL_JOB_TOKEN = "job-token-123";
            const req = makeRequest("/api/internal/jobs", { "x-internal-token": "job-token-123" });

            const res = await middleware(req);
            expect(res.headers.get('content-type')).not.toBe('application/json');
        });

        it("should reject token in query string as it is no longer supported", async () => {
            process.env.INTERNAL_TOKEN = "query-token";
            const req = makeRequest("/api/internal/tasks?token=query-token", {});
            const res = await middleware(req);
            expect((res as any).status).toBe(401);
            expect(await res.json()).toEqual({ error: "Unauthorized internal access" });
        });

        it("should allow QA bootstrap bypass in actions environment", async () => {
            process.env.QA_BOOTSTRAP_TOKEN = "qa-only";
            process.env.GITHUB_ACTIONS = "true";
            const req = makeRequest("/api/internal/qa/bootstrap-session", {
                "x-qa-token": "qa-only",
                "x-github-actions": "true"
            });
            const res = await middleware(req);
            expect((res as any).status).toBe(200);
        });
    });

    describe("Targeted Matcher rules: Health & Debug", () => {
        it("should allow exactly /api/health and strip spoofed headers", async () => {
             const reqHealth = makeRequest("/api/health", { "x-tenant-id": "hacker" });
             const nextSpy = vi.spyOn(NextResponse, "next").mockImplementation((args: any) => {
                 const h = args?.request?.headers as Headers;
                 expect(h.get("x-tenant-id")).toBeNull();
                 return new NextResponse();
             });
             await middleware(reqHealth);
             expect(nextSpy).toHaveBeenCalled();
             nextSpy.mockRestore();
        });

        it("should return 405 for POST /api/health", async () => {
            const { POST } = await import("../app/api/health/route");
            const res = await POST();
            expect(res.status).toBe(405);
        });

        it("should NOT allow /api/healthcheck (matcher bypass)", async () => {
            const req = makeRequest("/api/healthcheck", {});
            const res = await middleware(req);
            expect(res.status).toBe(401);
            expect(await res.json()).toEqual({ error: "Missing authentication token" });
        });

        it("should block /api/debug without Auth", async () => {
            const req = makeRequest("/api/debug", {});
            const res = await middleware(req);
            expect(res.status).toBe(401);
            expect(await res.json()).toEqual({ error: "Unauthorized internal access" });
        });

        it("should block /api/debug with INVALID token", async () => {
            const req = makeRequest("/api/debug", { "x-internal-token": "hacked" });
            const res = await middleware(req);
            expect(res.status).toBe(401);
        });

        it("should allow exactly /api/debug with VALID token and strip spoofed headers", async () => {
             process.env.INTERNAL_JOB_TOKEN = "valid-job-token";
             const req = makeRequest("/api/debug", {
                 "x-tenant-id": "hacker",
                 "x-internal-token": "valid-job-token"
             });
             const nextSpy = vi.spyOn(NextResponse, "next").mockImplementation((args: any) => {
                 const h = args?.request?.headers as Headers;
                 expect(h.get("x-tenant-id")).toBeNull();
                 return new NextResponse();
             });
             await middleware(req);
             expect(nextSpy).toHaveBeenCalled();
             nextSpy.mockRestore();
        });

        it("should NOT allow /api/debugger (matcher bypass)", async () => {
             process.env.INTERNAL_JOB_TOKEN = "valid-job-token";
             const req = makeRequest("/api/debugger", { "x-internal-token": "valid-job-token" });
             // Should verify cookieToken because it falls into regular API logic, completely ignoring the internal token
             const res = await middleware(req);
             expect(res.status).toBe(401);
             expect(await res.json()).toEqual({ error: "Missing authentication token" });
        });
    });

    describe("RULE 2 & 3: Session Check & Tenant Authorization", () => {
        it("should block /api/cockpit/* if session is missing", async () => {
            const req = makeRequest("/api/cockpit/timeline", {});
            const res = await middleware(req);
            expect(res.status).toBe(401);
            expect(await res.json()).toEqual({ error: "Missing authentication token" });
        });

        it("should block /api/simulate if session is missing", async () => {
            const req = makeRequest("/api/simulate", {});
            const res = await middleware(req);
            expect(res.status).toBe(401);
            expect(await res.json()).toEqual({ error: "Missing authentication token" });
        });

        it("should block representative global route /api/events/track if session missing", async () => {
            const req = makeRequest("/api/events/track", {});
            const res = await middleware(req);
            expect(res.status).toBe(401);
            expect(await res.json()).toEqual({ error: "Missing authentication token" });
        });

        it("should allow public webhook endpoints without session", async () => {
            const req = makeRequest("/api/webhooks/stripe", { "x-stripe-signature": "sig" });
            const nextSpy = vi.spyOn(NextResponse, "next").mockImplementation(() => new NextResponse());
            await middleware(req);
            expect(nextSpy).toHaveBeenCalled();
            nextSpy.mockRestore();
        });

        it("should strip spoofed headers and allow /api/simulate with valid session", async () => {
            (jose.jwtVerify as any).mockResolvedValue({
                payload: { sub: "usr_1", tenantId: "tnt_2", role: "admin" }
            });
            const req = makeRequest("/api/simulate", { "x-tenant-id": "hacker_tenant" }, { condstore_session: "good-token" });

            const nextSpy = vi.spyOn(NextResponse, "next").mockImplementation((args: any) => {
                const h = args?.request?.headers as Headers;
                // Spoofed header should be removed
                expect(h.get("x-tenant-id")).toBeNull();
                // Valid auth headers should be injected
                expect(h.get("x-auth-tenant-id")).toBe("tnt_2");
                expect(h.get("x-auth-user-id")).toBe("usr_1");
                return new NextResponse();
            });

            await middleware(req);
            expect(nextSpy).toHaveBeenCalled();
            nextSpy.mockRestore();
        });

        it("should block /api/cockpit/* if session JWT is invalid", async () => {
            (jose.jwtVerify as any).mockRejectedValue(new Error("Invalid token"));
            const req = makeRequest("/api/cockpit/timeline", {}, { condstore_session: "bad-token" });
            const res = await middleware(req);
            expect(res.status).toBe(401);
        });

        it("should inject x-auth headers into downstream request if session valid", async () => {
            (jose.jwtVerify as any).mockResolvedValue({
                payload: { sub: "usr_1", tenantId: "tnt_2", role: "admin" }
            });
            const req = makeRequest("/api/cockpit/timeline", {}, { condstore_session: "good-token" });

            const nextSpy = vi.spyOn(NextResponse, "next").mockImplementation((args: any) => {
                const h = args?.request?.headers as Headers;
                expect(h.get("x-auth-user-id")).toBe("usr_1");
                expect(h.get("x-auth-tenant-id")).toBe("tnt_2");
                expect(h.get("x-auth-role")).toBe("admin");
                return new NextResponse();
            });

            await middleware(req);
            expect(nextSpy).toHaveBeenCalled();
            nextSpy.mockRestore();
        });

        it("should block /api/tenants/* if JWT tenant does not match route tenant", async () => {
            (jose.jwtVerify as any).mockResolvedValue({
                payload: { sub: "usr_1", tenantId: "tnt_2", role: "admin" }
            });
            const req = makeRequest("/api/tenants/tnt_999/settings", {}, { condstore_session: "good-token" });
            const res = await middleware(req);

            expect(res.status).toBe(403);
            expect(await res.json()).toEqual({ error: "Tenant mismatch: Forbidden cross-tenant access" });
        });

        it("should allow /api/tenants/* if JWT tenant matches route tenant", async () => {
            (jose.jwtVerify as any).mockResolvedValue({
                payload: { sub: "usr_1", tenantId: "tnt_2", role: "admin" }
            });
            const req = makeRequest("/api/tenants/tnt_2/settings", {}, { condstore_session: "good-token" });

            const nextSpy = vi.spyOn(NextResponse, "next").mockImplementation(() => new NextResponse());
            await middleware(req);
            expect(nextSpy).toHaveBeenCalled();
            nextSpy.mockRestore();
        });
    });
});
