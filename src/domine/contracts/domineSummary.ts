export interface DomineSummary {
    tenantId: string;
    totalOrders: number;
    totalRevenue: number;
    activeConnectors: number;
    pendingShipments: number;
    status: "OK" | "DEGRADED" | "OUTAGE";
    generatedAt: string;
}
