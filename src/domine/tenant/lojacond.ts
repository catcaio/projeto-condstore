import { DomineCapabilities } from "../capabilities";

export const lojacondCapabilities: DomineCapabilities = {
    oms: true,
    integrations: true,
    logistics: true,
    fiscal: true,
    financial: true,
    apiLimits: {
        requestsPerMinute: 1000,
        enabled: true,
    },
    unlimitedUsers: true,
    storageRetentionDays: 365,
};
