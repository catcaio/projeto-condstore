import { DomineCapabilities } from "../capabilities";
import { lojacondCapabilities } from "./lojacond";

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

export function resolveTenantCapabilities(tenantId: string): DomineCapabilities {
    if (tenantId === "LOJACOND") {
        return lojacondCapabilities;
    }
    return fallbackCapabilities;
}

export function isDomineEnabled(tenantId: string): boolean {
    return tenantId === "LOJACOND";
}
