import { describe, expect, it } from 'vitest';
import {
    getFrankActionPolicy,
    isFrankActionRiskAtLeast,
    resolveFrankActionPolicyBlockReason,
} from './action-policy';

describe('Frank action policy', () => {
    it('requires high risk classification for critical order updates', () => {
        const reason = resolveFrankActionPolicyBlockReason({
            type: 'order_update_status',
            status: 'review_required',
            recordedRisk: 'medium',
        });

        expect(reason).toBe('Action "order_update_status" must be classified at least as high risk before execution.');
    });

    it('blocks unsupported high-risk actions even after review', () => {
        const reason = resolveFrankActionPolicyBlockReason({
            type: 'conversation_approve_suggested_reply',
            status: 'review_required',
            recordedRisk: 'high',
        });

        expect(reason).toContain('blocked by policy');
        expect(getFrankActionPolicy('conversation_approve_suggested_reply').executionState).toBe('blocked');
    });

    it('allows wired actions with manual review and sufficient risk', () => {
        const reason = resolveFrankActionPolicyBlockReason({
            type: 'logistics_update_shipment_status',
            status: 'review_required',
            recordedRisk: 'high',
        });

        expect(reason).toBeNull();
    });

    it('compares risk levels consistently', () => {
        expect(isFrankActionRiskAtLeast('high', 'medium')).toBe(true);
        expect(isFrankActionRiskAtLeast('medium', 'high')).toBe(false);
    });
});
