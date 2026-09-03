import { describe, it, expect } from 'vitest';
import { frankHumanGatePolicyEngine } from '../frank-human-gate-policy';

describe('Frank Human Gate Policy Engine', () => {
    const userId = 'user_admin_123';
    const tenantId = 'tenant_policy_test';

    it('should ALLOW safe actions without human token', () => {
        const result = frankHumanGatePolicyEngine.evaluate({
            userId,
            tenantId,
            actionType: 'READ_METRICS',
            riskClass: 'SAFE',
            requiresHumanApproval: false,
        });

        expect(result.allowed).toBe(true);
        expect(result.reason).toContain('ALLOW');
    });

    it('should DENY guarded/critical actions if human token is missing', () => {
        const result = frankHumanGatePolicyEngine.evaluate({
            userId,
            tenantId,
            actionType: 'DEPLOY_CODE_CHANGE',
            riskClass: 'CRITICAL',
            requiresHumanApproval: true,
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('DENY');
    });

    it('should DENY action if approval token is expired', () => {
        const expiredDate = new Date(Date.now() - 120 * 60 * 1000); // 2 hours ago

        const result = frankHumanGatePolicyEngine.evaluate({
            userId,
            tenantId,
            actionType: 'PROPOSE_FACTORY_ISSUE',
            riskClass: 'GUARDED',
            requiresHumanApproval: true,
            approvalToken: 'tok_approved_123',
            tokenIssuedAt: expiredDate,
            maxTokenAgeMinutes: 60,
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('expired');
    });

    it('should ALLOW guarded action with valid human approval token', () => {
        const result = frankHumanGatePolicyEngine.evaluate({
            userId,
            tenantId,
            actionType: 'PROPOSE_FACTORY_ISSUE',
            riskClass: 'GUARDED',
            requiresHumanApproval: true,
            approvalToken: 'tok_approved_valid',
            tokenIssuedAt: new Date(),
        });

        expect(result.allowed).toBe(true);
        expect(result.reason).toContain('ALLOW');
    });
});
