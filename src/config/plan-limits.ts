export type PlanId = 'starter' | 'essencial' | 'growth';
export type FinopsState = 'unlocked' | 'degraded_preemptive' | 'degraded' | 'locked';

export interface PlanLimits {
    freight_simulations_per_month: number;
    whatsapp_outbound_per_month: number;
    inbox_conversations_per_month: number;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
    starter: {
        freight_simulations_per_month: 50,
        whatsapp_outbound_per_month: 100,
        inbox_conversations_per_month: 0,
    },
    essencial: {
        freight_simulations_per_month: 500,
        whatsapp_outbound_per_month: 1000,
        inbox_conversations_per_month: 50,
    },
    growth: {
        freight_simulations_per_month: 5000,
        whatsapp_outbound_per_month: 10000,
        inbox_conversations_per_month: 500,
    }
};

export const FINOPS_THRESHOLDS = {
    preemptive_at: 0.8,
    degraded_at: 1.0,
    locked_at: 1.1,
};
