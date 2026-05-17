import { describe, it, expect, vi } from "vitest";
import { resolveTenantCapabilities, isDomineEnabled } from "../tenant";
import { configRepository } from "../../modules/config/config.repository";

describe("Tenant Resolver", () => {
    it("should return LOJACOND capabilities", async () => {
        const caps = await resolveTenantCapabilities("LOJACOND");
        expect(caps.oms).toBe(true);
        expect(caps.unlimitedUsers).toBe(true);
    });

    it("should return fallback capabilities for unknown tenant", async () => {
        const caps = await resolveTenantCapabilities("OTHER_TENANT");
        expect(caps.oms).toBe(false);
        expect(caps.unlimitedUsers).toBe(false);
    });

    it("should correctly identify if domine is enabled", async () => {
        expect(await isDomineEnabled("LOJACOND")).toBe(true);
        expect(await isDomineEnabled("OTHER")).toBe(false);
    });

    it("should dynamically enable domine via DB configuration", async () => {
        const spy = vi.spyOn(configRepository, "get").mockResolvedValueOnce({
            id: "test-id",
            key: "domine.enabled",
            value: true,
            category: "general" as any,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: "test",
        });
        const enabled = await isDomineEnabled("DYNAMIC_TENANT");
        expect(enabled).toBe(true);
        expect(spy).toHaveBeenCalledWith("DYNAMIC_TENANT", "domine.enabled");
    });
});
