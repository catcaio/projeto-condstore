/**
 * Plan definitions and usage limits for feature gating.
 * This is the single source of truth for plan enforcement on the backend.
 * Never trust the frontend — always derive the plan from the tenant record.
 */

export enum Plan {
    FREE = 'FREE',
    STARTER = 'STARTER',
    PRO = 'PRO',
    ENTERPRISE = 'ENTERPRISE',
}

export interface PlanLimits {
    /** Max freight simulations per calendar day (per tenant) */
    maxSimulationsPerDay: number;
    /** Max inbound WhatsApp messages per calendar month (per tenant) */
    maxMessagesPerMonth: number;
    /** Whether the AI-powered webhook response is enabled */
    webhookAIEnabled: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
    [Plan.FREE]: {
        maxSimulationsPerDay: 20,
        maxMessagesPerMonth: 500,
        webhookAIEnabled: false,
    },
    [Plan.STARTER]: {
        maxSimulationsPerDay: 100,
        maxMessagesPerMonth: 3000,
        webhookAIEnabled: true,
    },
    [Plan.PRO]: {
        maxSimulationsPerDay: 1000,
        maxMessagesPerMonth: 15000,
        webhookAIEnabled: true,
    },
    [Plan.ENTERPRISE]: {
        maxSimulationsPerDay: Infinity,
        maxMessagesPerMonth: Infinity,
        webhookAIEnabled: true,
    },
};

/**
 * Parse a raw string from the DB into a Plan enum value.
 * Falls back to FREE if unknown/missing (safe default).
 */
export function parsePlan(raw: string | null | undefined): Plan {
    if (raw && Object.values(Plan).includes(raw as Plan)) {
        return raw as Plan;
    }
    return Plan.FREE;
}
