import { DomineCapabilities } from "../capabilities";
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

function isDomineCapabilities(value: unknown): value is DomineCapabilities {
    if (!value || typeof value !== "object") {
        return false;
    }

    const candidate = value as Partial<DomineCapabilities>;
    return typeof candidate.oms === "boolean"
        && typeof candidate.integrations === "boolean"
        && typeof candidate.logistics === "boolean"
        && typeof candidate.fiscal === "boolean"
        && typeof candidate.financial === "boolean"
        && typeof candidate.unlimitedUsers === "boolean"
        && typeof candidate.storageRetentionDays === "number"
        && !!candidate.apiLimits
        && typeof candidate.apiLimits.enabled === "boolean"
        && typeof candidate.apiLimits.requestsPerMinute === "number";
}

function parseDomineEnabled(value: unknown): boolean | null {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        if (value === "true") return true;
        if (value === "false") return false;
        return null;
    }

    if (value && typeof value === "object" && "enabled" in value) {
        const enabled = (value as { enabled?: unknown }).enabled;
        if (typeof enabled === "boolean") return enabled;
        if (enabled === "true") return true;
        if (enabled === "false") return false;
    }

    return null;
}

export async function resolveTenantCapabilities(tenantId: string): Promise<DomineCapabilities> {
    try {
        const config = await configRepository.get(tenantId, "domine.capabilities");
        if (isDomineCapabilities(config?.value)) {
            return config.value;
        }
    } catch {
        // Ignore DB/connection errors and use fallback
    }

    return fallbackCapabilities;
}

export async function isDomineEnabled(tenantId: string): Promise<boolean> {
    try {
        const config = await configRepository.get(tenantId, "domine.enabled");
        const parsed = parseDomineEnabled(config?.value);
        if (parsed !== null) {
            return parsed;
        }
    } catch {
        // Ignore DB/connection errors and use fallback
    }

    // Safe default: disabled until the tenant is explicitly enabled via config.
    return false;
}

