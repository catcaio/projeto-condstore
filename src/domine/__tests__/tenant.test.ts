import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveTenantCapabilities, isDomineEnabled } from "../tenant";
import { configRepository } from "../../modules/config/config.repository";

afterEach(() => {
    vi.restoreAllMocks();
});

describe("Tenant Resolver", () => {
    it("should return configured capabilities from tenant config", async () => {
        vi.spyOn(configRepository, "get").mockResolvedValueOnce({
            id: "test-id",
            key: "domine.capabilities",
            value: {
                oms: true,
                integrations: true,
                logistics: true,
                fiscal: false,
                financial: false,
                apiLimits: {
                    requestsPerMinute: 180,
                    enabled: true,
                },
                unlimitedUsers: true,
                storageRetentionDays: 90,
            },
            category: "operacao" as any,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: "test",
        });

        const caps = await resolveTenantCapabilities("TENANT_WITH_DOMINE");
        expect(caps.oms).toBe(true);
        expect(caps.unlimitedUsers).toBe(true);
        expect(caps.apiLimits.requestsPerMinute).toBe(180);
    });

    it("should return neutral fallback capabilities when config is missing", async () => {
        vi.spyOn(configRepository, "get").mockResolvedValueOnce(null);
        const caps = await resolveTenantCapabilities("OTHER_TENANT");
        expect(caps.oms).toBe(false);
        expect(caps.unlimitedUsers).toBe(false);
        expect(caps.apiLimits.requestsPerMinute).toBe(60);
    });

    it("should keep domine disabled by default when config is missing", async () => {
        vi.spyOn(configRepository, "get").mockResolvedValueOnce(null);
        expect(await isDomineEnabled("OTHER")).toBe(false);
    });

    it("should dynamically enable domine via DB configuration", async () => {
        const spy = vi.spyOn(configRepository, "get").mockResolvedValueOnce({
            id: "test-id",
            key: "domine.enabled",
            value: true,
            category: "operacao" as any,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: "test",
        });
        const enabled = await isDomineEnabled("DYNAMIC_TENANT");
        expect(enabled).toBe(true);
        expect(spy).toHaveBeenCalledWith("DYNAMIC_TENANT", "domine.enabled");
    });

    it("should parse domine.enabled objects consistently", async () => {
        vi.spyOn(configRepository, "get").mockResolvedValueOnce({
            id: "test-id",
            key: "domine.enabled",
            value: { enabled: "true" },
            category: "operacao" as any,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: "test",
        });

        expect(await isDomineEnabled("OBJECT_CONFIG_TENANT")).toBe(true);
    });
});
