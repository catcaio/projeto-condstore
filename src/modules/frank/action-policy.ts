import type { Explainability, FrankActionType } from './action-contracts';

export type FrankActionRiskLevel = Explainability['risk'];

export interface FrankActionPolicy {
    minimumRisk: FrankActionRiskLevel;
    requiresManualReview: boolean;
    executionState: 'enabled' | 'blocked';
    blockReason?: string;
}

const RISK_PRIORITY: Record<FrankActionRiskLevel, number> = {
    low: 0,
    medium: 1,
    high: 2,
};

function enabled(minimumRisk: FrankActionRiskLevel): FrankActionPolicy {
    return {
        minimumRisk,
        requiresManualReview: true,
        executionState: 'enabled',
    };
}

function blocked(minimumRisk: FrankActionRiskLevel, blockReason: string): FrankActionPolicy {
    return {
        minimumRisk,
        requiresManualReview: true,
        executionState: 'blocked',
        blockReason,
    };
}

const BLOCK_UNTIL_WIRED = 'blocked by policy until the domain handler is fully wired.';

export const FRANK_ACTION_POLICY: Record<FrankActionType, FrankActionPolicy> = {
    crm_move_opportunity_stage: enabled('medium'),
    crm_assign_opportunity_owner: enabled('medium'),
    crm_create_follow_up: blocked('medium', `Action "crm_create_follow_up" is ${BLOCK_UNTIL_WIRED}`),
    crm_register_loss_reason: blocked('medium', `Action "crm_register_loss_reason" is ${BLOCK_UNTIL_WIRED}`),
    crm_mark_opportunity_temperature: blocked('low', `Action "crm_mark_opportunity_temperature" is ${BLOCK_UNTIL_WIRED}`),

    order_update_status: enabled('high'),
    order_assign_owner: enabled('medium'),
    order_flag_risk: blocked('high', `Action "order_flag_risk" is ${BLOCK_UNTIL_WIRED}`),
    order_open_exception: blocked('high', `Action "order_open_exception" is ${BLOCK_UNTIL_WIRED}`),

    logistics_update_shipment_status: enabled('high'),
    logistics_flag_delay: blocked('high', `Action "logistics_flag_delay" is ${BLOCK_UNTIL_WIRED}`),
    logistics_assign_owner: blocked('medium', `Action "logistics_assign_owner" is ${BLOCK_UNTIL_WIRED}`),
    logistics_create_follow_up: blocked('medium', `Action "logistics_create_follow_up" is ${BLOCK_UNTIL_WIRED}`),

    conversation_assign_owner: enabled('medium'),
    conversation_set_priority: blocked('high', `Action "conversation_set_priority" is ${BLOCK_UNTIL_WIRED}`),
    conversation_schedule_follow_up: blocked('medium', `Action "conversation_schedule_follow_up" is ${BLOCK_UNTIL_WIRED}`),
    conversation_approve_suggested_reply: blocked('high', `Action "conversation_approve_suggested_reply" is ${BLOCK_UNTIL_WIRED}`),
};

export function getFrankActionPolicy(type: FrankActionType): FrankActionPolicy {
    return FRANK_ACTION_POLICY[type];
}

export function isFrankActionRiskAtLeast(
    recordedRisk: FrankActionRiskLevel,
    minimumRisk: FrankActionRiskLevel,
): boolean {
    return RISK_PRIORITY[recordedRisk] >= RISK_PRIORITY[minimumRisk];
}

export function resolveFrankActionPolicyBlockReason(params: {
    type: FrankActionType;
    status: string;
    recordedRisk: FrankActionRiskLevel;
}): string | null {
    const policy = getFrankActionPolicy(params.type);

    if (policy.requiresManualReview && params.status !== 'review_required') {
        return `Action "${params.type}" requires manual review before execution.`;
    }

    if (!isFrankActionRiskAtLeast(params.recordedRisk, policy.minimumRisk)) {
        return `Action "${params.type}" must be classified at least as ${policy.minimumRisk} risk before execution.`;
    }

    if (policy.executionState === 'blocked') {
        return policy.blockReason ?? `Action "${params.type}" is blocked by policy.`;
    }

    return null;
}
