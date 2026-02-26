import { describe, it, expect } from "vitest";
import { resolveTenantCapabilities, isDomineEnabled } from "../tenant";

describe("Tenant Resolver", () => {
    it("should return LOJACOND capabilities", () => {
        const caps = resolveTenantCapabilities("LOJACOND");
        expect(caps.oms).toBe(true);
        expect(caps.unlimitedUsers).toBe(true);
    });

    it("should return fallback capabilities for unknown tenant", () => {
        const caps = resolveTenantCapabilities("OTHER_TENANT");
        expect(caps.oms).toBe(false);
        expect(caps.unlimitedUsers).toBe(false);
    });

    it("should correctly identify if domine is enabled", () => {
        expect(isDomineEnabled("LOJACOND")).toBe(true);
        expect(isDomineEnabled("OTHER")).toBe(false);
    });
});
