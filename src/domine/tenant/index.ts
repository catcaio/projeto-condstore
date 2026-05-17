import { DomineCapabilities } from "../capabilities";
import { lojacondCapabilities } from "./lojacond";
import { configRepository } from "../../modules/config/config.repository";

const fallbackCapabilities: DomineCapabilities = {
    oms: false,
    integrations: false,
    logistics: false,
    fiscal: false,
    financial: false,
    apiLimits: {
        requestsPerMinute: 60,
        enabled: true,
    },
    unlimitedUsers: false,
    storageRetentionDays: 30,
};

export async function resolveTenantCapabilities(tenantId: string): Promise<DomineCapabilities> {
    try {
        const config = await configRepository.get(tenantId, "domine.capabilities");
        if (config && config.value) {
            return config.value as DomineCapabilities;
        }
    } catch (err) {
        // Ignore DB/connection errors and use fallback
    }

    if (tenantId === "LOJACOND") {
        return lojacondCapabilities;
    }
    return fallbackCapabilities;
}

export async function isDomineEnabled(tenantId: string): Promise<boolean> {
    try {
        const config = await configRepository.get(tenantId, "domine.enabled");
        if (config) {
            const val = config.value;
            if (typeof val === "boolean") return val;
            if (typeof val === "string") return val === "true";
            if (val && typeof val === "object") {
                if ("enabled" in val) {
                    return !!(val as any).enabled;
                }
            }
        }
    } catch (err) {
        // Ignore DB/connection errors and use fallback
    }

    return tenantId === "LOJACOND" || tenantId === "condstore-public";
}

