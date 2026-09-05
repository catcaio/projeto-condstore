import { logger } from '@/infra/logger';

export type FrankToolAction =
    | 'freight_calculation'
    | 'create_quote'
    | 'create_order_from_quote'
    | 'get_order_status'
    | 'get_shipment_status'
    | 'get_recent_orders'
    | 'get_recent_quotes'
    | 'get_customer_context';

export type FrankToolRiskLevel = 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK';

export interface FrankToolPolicyContext {
    tenantId: string;
    requestId: string;
    allowHighRisk?: boolean;
    humanApprovalToken?: string;
}

export interface FrankToolPolicyInput {
    targetTenantId?: string;
}

export interface FrankToolPolicyDecision {
    allowed: boolean;
    riskLevel: FrankToolRiskLevel;
    reason?: string;
}

const ACTION_RISK_MAP: Readonly<Record<FrankToolAction, FrankToolRiskLevel>> = {
    freight_calculation: 'LOW_RISK',
    create_quote: 'MEDIUM_RISK',
    create_order_from_quote: 'HIGH_RISK',
    get_order_status: 'LOW_RISK',
    get_shipment_status: 'LOW_RISK',
    get_recent_orders: 'LOW_RISK',
    get_recent_quotes: 'LOW_RISK',
    get_customer_context: 'LOW_RISK',
};

export function evaluateFrankToolPolicy(
    action: FrankToolAction,
    context: FrankToolPolicyContext,
    input: FrankToolPolicyInput = {},
): FrankToolPolicyDecision {
    const riskLevel = ACTION_RISK_MAP[action];

    if (input.targetTenantId && input.targetTenantId !== context.tenantId) {
        logger.warn('frank_tool_policy_blocked', {
            tenantId: context.tenantId,
            requestId: context.requestId,
            action,
            riskLevel,
            reason: 'tenant_mismatch',
            targetTenantId: input.targetTenantId,
        });

        return {
            allowed: false,
            riskLevel,
            reason: 'tenant_mismatch',
        };
    }

    if (riskLevel === 'HIGH_RISK') {
        const hasToken = context.humanApprovalToken && context.humanApprovalToken.trim().length > 0;
        if (!hasToken) {
            logger.warn('frank_tool_policy_blocked', {
                tenantId: context.tenantId,
                requestId: context.requestId,
                action,
                riskLevel,
                reason: 'missing_human_approval_token',
            });

            return {
                allowed: false,
                riskLevel,
                reason: 'missing_human_approval_token',
            };
        }

        if (!context.allowHighRisk) {
            logger.warn('frank_tool_policy_blocked', {
                tenantId: context.tenantId,
                requestId: context.requestId,
                action,
                riskLevel,
                reason: 'missing_high_risk_precondition',
            });

            return {
                allowed: false,
                riskLevel,
                reason: 'missing_high_risk_precondition',
            };
        }
    }

    return {
        allowed: true,
        riskLevel,
    };
}
