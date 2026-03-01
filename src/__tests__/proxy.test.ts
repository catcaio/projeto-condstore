import { NextRequest, NextResponse } from "next/server";
import { proxy } from "../proxy";
import * as jose from "jose";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("jose", () => ({
    jwtVerify: vi.fn()
}));

describe("Proxy Edge Middleware", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (process.env as any).NODE_ENV = "test";
        process.env.AUTH_SECRET = "supersecret";
    });

    function makeRequest(url: string, headers: Record<string, string>, cookies: Record<string, string> = {}) {
        const req = new NextRequest(`http://localhost${url}`);
        for (const [key, val] of Object.entries(headers)) {
            req.headers.set(key, val);
        }
        for (const [key, val] of Object.entries(cookies)) {
            req.cookies.set(key, val);
        }
        return req;
    }

    it("should strip x-tenant-id unconditionally on unprotected routes to prevent IDOR", async () => {
        // Unprotected route (/api/events) doesn't enforce session auth
        // But the middleware must still strip spoofed tenant IDs
        const req = makeRequest("/api/events", {
            "x-tenant-id": "hacker-tenant",
            "x-role": "admin",
            "x-auth-user-id": "hacked"
        });

        const res = await proxy(req);

        // Proxy passes execution to next middleware/app router
        expect(res).toBeInstanceOf(NextResponse);

        // The outbound modified headers must NOT contain the malicious ones
        const outHeaders = res.headers; // NextResponse doesn't expose modified input headers easily, wait Next.js NextRequest overrides headers

        // Actually, NextResponse.next({ request: { headers } }) applies headers internally.
        // We can inspect the internal property or mock `Headers` to track calls, 
        // but NextRequest headers are mutable via the returned request options.
        // In unit bounds, we must inspect the req headers clone passed to NextResponse.next.
        // Sadly NextResponse doesn't export it clearly. But since proxy mutates the `headers` variable and uses it:
        expect(req.headers.get("x-tenant-id")).toBe("hacker-tenant"); // Original unmodified

        // We'll mock NextResponse.next to spy on the headers passed
        const nextSpy = vi.spyOn(NextResponse, "next").mockImplementation((args: any) => {
            const h = args?.request?.headers;
            expect(h.get("x-tenant-id")).toBeNull();
            expect(h.get("x-role")).toBeNull();
            expect(h.get("x-auth-user-id")).toBeNull();
            return new NextResponse();
        });

        await proxy(req);
        expect(nextSpy).toHaveBeenCalled();
        nextSpy.mockRestore();
    });

    it("should reinject valid session context into trusted x-auth-* headers on protected routes", async () => {
        const req = makeRequest("/api/cockpit/dashboard",
            {
                "x-tenant-id": "malicious"
            },
            {
                "condstore_session": "valid_token"
            }
        );

        (jose.jwtVerify as any).mockResolvedValue({
            payload: {
                sub: "usr_123",
                tenantId: "tnt_456",
                role: "admin"
            }
        });

        const nextSpy = vi.spyOn(NextResponse, "next").mockImplementation((args: any) => {
            const h = args?.request?.headers;
            expect(h.get("x-tenant-id")).toBeNull();
            expect(h.get("x-auth-tenant-id")).toBe("tnt_456");
            expect(h.get("x-auth-user-id")).toBe("usr_123");
            expect(h.get("x-auth-role")).toBe("admin");
            return new NextResponse();
        });

        await proxy(req);

        expect(jose.jwtVerify).toHaveBeenCalled();
        expect(nextSpy).toHaveBeenCalled();
        nextSpy.mockRestore();
    });
});
