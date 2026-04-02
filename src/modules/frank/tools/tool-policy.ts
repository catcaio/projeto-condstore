import { logger } from '@/infra/logger';

export type FrankToolAction =
    | 'freight_calculation'
    | 'create_quote'
    | 'create_order_from_quote'
    | 'get_order_status'
    | 'get_shipment_status';

export type FrankToolRiskLevel = 'LOW_RISK' | 'HIGH_RISK';

export interface FrankToolPolicyContext {
    tenantId: string;
    requestId: string;
    allowHighRisk?: boolean;
}

export interface FrankToolPolicyDecision {
    allowed: boolean;
    riskLevel: FrankToolRiskLevel;
    reason?: string;
}

const HIGH_RISK_ACTIONS: ReadonlySet<FrankToolAction> = new Set([
    'create_quote',
    'create_order_from_quote',
]);

const HIGH_RISK_BLOCK_REASON = 'missing_high_risk_precondition';

export function evaluateFrankToolPolicy(
    action: FrankToolAction,
    context: FrankToolPolicyContext,
): FrankToolPolicyDecision {
    const riskLevel: FrankToolRiskLevel = HIGH_RISK_ACTIONS.has(action) ? 'HIGH_RISK' : 'LOW_RISK';

    if (riskLevel === 'HIGH_RISK' && !context.allowHighRisk) {
        logger.warn('frank_tool_policy_blocked', {
            tenantId: context.tenantId,
            requestId: context.requestId,
            action,
            riskLevel,
            reason: HIGH_RISK_BLOCK_REASON,
            requiredValidation: 'allowHighRisk=true',
        });

        return {
            allowed: false,
            riskLevel,
            reason: HIGH_RISK_BLOCK_REASON,
        };
    }

    return {
        allowed: true,
        riskLevel,
    };
}
