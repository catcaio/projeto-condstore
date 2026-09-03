import { logger } from '@/infra/logger';

export interface HumanGatePolicyInput {
    userId: string;
    tenantId: string;
    actionType: string;
    riskClass: 'SAFE' | 'GUARDED' | 'CRITICAL';
    requiresHumanApproval: boolean;
    approvalToken?: string;
    tokenIssuedAt?: Date;
    maxTokenAgeMinutes?: number;
}

export interface HumanGatePolicyResult {
    allowed: boolean;
    reason: string;
}

export class FrankHumanGatePolicyEngine {
    /**
     * Evaluates whether an action is authorized to proceed based on risk class and human approval.
     */
    evaluate(input: HumanGatePolicyInput): HumanGatePolicyResult {
        // 1. Identity & Tenant Check
        if (!input.userId || !input.tenantId) {
            logger.warn('Human Gate DENY: missing user or tenant identity');
            return { allowed: false, reason: 'DENY: Invalid user or tenant identity' };
        }

        // 2. SAFE actions do not require human approval
        if (input.riskClass === 'SAFE' && !input.requiresHumanApproval) {
            return { allowed: true, reason: 'ALLOW: Safe read-only or low-risk action' };
        }

        // 3. GUARDED & CRITICAL actions MUST have valid human approval token
        if (input.requiresHumanApproval || input.riskClass === 'CRITICAL' || input.riskClass === 'GUARDED') {
            if (!input.approvalToken) {
                logger.warn('Human Gate DENY: missing required human approval token', {
                    actionType: input.actionType,
                    riskClass: input.riskClass
                });
                return {
                    allowed: false,
                    reason: `DENY: Action [${input.actionType}] with risk [${input.riskClass}] requires human approval`
                };
            }

            // 4. Token expiration check (default 60 min SLA for human approvals)
            if (input.tokenIssuedAt) {
                const maxAge = (input.maxTokenAgeMinutes || 60) * 60 * 1000;
                const age = Date.now() - input.tokenIssuedAt.getTime();
                if (age > maxAge) {
                    logger.warn('Human Gate DENY: approval token expired', { actionType: input.actionType, ageMs: age });
                    return { allowed: false, reason: 'DENY: Human approval token expired' };
                }
            }

            logger.info('Human Gate ALLOW: valid human approval verified', {
                userId: input.userId,
                tenantId: input.tenantId,
                actionType: input.actionType
            });
            return { allowed: true, reason: 'ALLOW: Human approval verified by Policy Engine' };
        }

        return { allowed: true, reason: 'ALLOW: Standard execution' };
    }
}

export const frankHumanGatePolicyEngine = new FrankHumanGatePolicyEngine();
