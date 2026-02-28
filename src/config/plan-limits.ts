export type PlanId = 'starter' | 'essencial' | 'growth';
export type FinopsState = 'unlocked' | 'degraded_preemptive' | 'degraded' | 'locked';

export interface PlanLimits {
    freight_simulations_per_month: number;
    whatsapp_outbound_per_month: number;
    inbox_conversations_per_month: number;
    knowledge_max_file_size_bytes: number;
    knowledge_max_files_per_month: number;
    knowledge_max_storage_total_bytes: number;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
    starter: {
        freight_simulations_per_month: 50,
        whatsapp_outbound_per_month: 100,
        inbox_conversations_per_month: 0,
        knowledge_max_file_size_bytes: 5 * 1024 * 1024, // 5MB
        knowledge_max_files_per_month: 10,
        knowledge_max_storage_total_bytes: 50 * 1024 * 1024, // 50MB
    },
    essencial: {
        freight_simulations_per_month: 500,
        whatsapp_outbound_per_month: 1000,
        inbox_conversations_per_month: 50,
        knowledge_max_file_size_bytes: 10 * 1024 * 1024, // 10MB
        knowledge_max_files_per_month: 50,
        knowledge_max_storage_total_bytes: 500 * 1024 * 1024, // 500MB
    },
    growth: {
        freight_simulations_per_month: 5000,
        whatsapp_outbound_per_month: 10000,
        inbox_conversations_per_month: 500,
        knowledge_max_file_size_bytes: 25 * 1024 * 1024, // 25MB
        knowledge_max_files_per_month: 200,
        knowledge_max_storage_total_bytes: 5 * 1024 * 1024 * 1024, // 5GB
    }
};

export const FINOPS_THRESHOLDS = {
    preemptive_at: 0.8,
    degraded_at: 1.0,
    locked_at: 1.1,
};
