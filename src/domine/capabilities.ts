export interface DomineCapabilities {
    oms: boolean;
    integrations: boolean;
    logistics: boolean;
    fiscal: boolean;
    financial: boolean;
    apiLimits: {
        requestsPerMinute: number;
        enabled: boolean;
    };
    unlimitedUsers: boolean;
    storageRetentionDays: number;
}
