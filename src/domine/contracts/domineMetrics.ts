export interface DomineMetrics {
    tenantId: string;
    period: "DAY" | "WEEK" | "MONTH";
    financialGtv: number;
    ordersProcessed: number;
    integrationErrors: number;
    logisticsSLA: number; // percentage
}
