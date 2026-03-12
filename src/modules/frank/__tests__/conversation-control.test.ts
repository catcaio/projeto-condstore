import { describe, it, expect } from 'vitest';
import {
    resolveConversationMode,
    isBusinessHours,
    type ConversationGateInput,
} from '../conversation-control';
import type { ExtractedEntities } from '../entity-resolver';

const EMPTY_ENTITIES: ExtractedEntities = {
    product: null,
    quantity: null,
    volume: null,
    orderId: null,
    documentType: null,
};

function makeInput(overrides: Partial<ConversationGateInput>): ConversationGateInput {
    return {
        intent: 'ORDER_STATUS',
        entities: EMPTY_ENTITIES,
        confidence: 0.8,
        timestamp: new Date('2026-03-12T10:00:00-03:00'), // Thursday 10am BRT
        operatorOnline: false,
        entitiesComplete: true,
        autoResponsesCount: 0,
        messageBody: 'test',
        ...overrides,
    };
}

describe('Conversation Control Gate', () => {
    describe('isBusinessHours', () => {
        it('should return true for weekday during business hours (10am BRT)', () => {
            const thursday10am = new Date('2026-03-12T13:00:00Z'); // 10am BRT
            expect(isBusinessHours(thursday10am)).toBe(true);
        });

        it('should return false for weekday outside business hours (2am BRT)', () => {
            const thursday2am = new Date('2026-03-12T05:00:00Z'); // 2am BRT
            expect(isBusinessHours(thursday2am)).toBe(false);
        });

        it('should return false for Saturday during business hours', () => {
            const saturday10am = new Date('2026-03-14T13:00:00Z'); // Saturday 10am BRT
            expect(isBusinessHours(saturday10am)).toBe(false);
        });

        it('should return false for Sunday', () => {
            const sunday10am = new Date('2026-03-15T13:00:00Z'); // Sunday 10am BRT
            expect(isBusinessHours(sunday10am)).toBe(false);
        });
    });

    describe('resolveConversationMode', () => {
        it('should return SUPERVISED if frustration is detected', () => {
            const result = resolveConversationMode(makeInput({
                messageBody: 'não entendi nada',
                intent: 'ORDER_STATUS',
                confidence: 0.9,
            }));
            expect(result.mode).toBe('SUPERVISED');
            expect(result.reason).toContain('frustration');
        });

        it('should return SUPERVISED if auto-response limit is reached', () => {
            const result = resolveConversationMode(makeInput({
                autoResponsesCount: 6,
                intent: 'ORDER_STATUS',
                confidence: 0.9,
            }));
            expect(result.mode).toBe('SUPERVISED');
            expect(result.reason).toContain('auto_response_limit');
        });

        it('should return SUPERVISED if entities are incomplete', () => {
            const result = resolveConversationMode(makeInput({
                entitiesComplete: false,
                intent: 'FRETE',
                confidence: 0.9,
            }));
            expect(result.mode).toBe('SUPERVISED');
            expect(result.reason).toContain('incomplete_entities');
        });

        it('should return SUPERVISED for low confidence regardless of intent (threshold < 0.6)', () => {
            const result = resolveConversationMode(makeInput({
                intent: 'ORDER_STATUS',
                confidence: 0.55, // previously would be ASSISTED if old threshold was 0.5
            }));
            expect(result.mode).toBe('SUPERVISED');
            expect(result.reason).toContain('confidence_below_threshold');
        });

        it('should return SUPERVISED for sensitive intent (CONFIRM_ORDER)', () => {
            const result = resolveConversationMode(makeInput({
                intent: 'CONFIRM_ORDER',
                confidence: 0.9,
            }));
            expect(result.mode).toBe('SUPERVISED');
            expect(result.reason).toContain('sensitive_intent');
        });

        it('should return SUPERVISED for sensitive intent (COMPLAINT)', () => {
            const result = resolveConversationMode(makeInput({
                intent: 'COMPLAINT',
                confidence: 0.9,
            }));
            expect(result.mode).toBe('SUPERVISED');
            expect(result.reason).toContain('sensitive_intent');
        });

        it('should return ASSISTED for informational intent with high confidence during business hours', () => {
            const result = resolveConversationMode(makeInput({
                intent: 'ORDER_STATUS',
                confidence: 0.75,
                timestamp: new Date('2026-03-12T13:00:00Z'), // 10am BRT Thursday
            }));
            expect(result.mode).toBe('ASSISTED');
            expect(result.reason).toContain('informational_high_confidence');
        });

        it('should return AUTONOMOUS for informational intent off-hours with NO operator online', () => {
            const result = resolveConversationMode(makeInput({
                intent: 'ORDER_STATUS',
                confidence: 0.85,
                timestamp: new Date('2026-03-12T05:00:00Z'), // 2am BRT
                operatorOnline: false,
            }));
            expect(result.mode).toBe('AUTONOMOUS');
            expect(result.reason).toContain('off_hours_informational');
        });

        it('should return ASSISTED for informational intent off-hours WITH operator online', () => {
            const result = resolveConversationMode(makeInput({
                intent: 'ORDER_STATUS',
                confidence: 0.9,
                timestamp: new Date('2026-03-12T05:00:00Z'), // 2am BRT
                operatorOnline: true,
            }));
            expect(result.mode).toBe('ASSISTED');
            expect(result.reason).toContain('operator_online_override');
        });

        it('should return ASSISTED for SAUDACAO during business hours', () => {
            const result = resolveConversationMode(makeInput({
                intent: 'SAUDACAO',
                confidence: 0.9,
                timestamp: new Date('2026-03-12T13:00:00Z'),
                operatorOnline: false,
            }));
            expect(result.mode).toBe('ASSISTED');
            expect(result.reason).toContain('greeting (business_hours)');
        });

        it('should return ASSISTED for SAUDACAO off-hours but WITH operator online', () => {
            const result = resolveConversationMode(makeInput({
                intent: 'SAUDACAO',
                confidence: 0.9,
                timestamp: new Date('2026-03-12T05:00:00Z'), // 2am BRT
                operatorOnline: true,
            }));
            expect(result.mode).toBe('ASSISTED');
            expect(result.reason).toContain('greeting (operator_online)');
        });

        it('should return AUTONOMOUS for SAUDACAO off-hours and NO operator online', () => {
            const result = resolveConversationMode(makeInput({
                intent: 'SAUDACAO',
                confidence: 0.9,
                timestamp: new Date('2026-03-12T05:00:00Z'), // 2am BRT
                operatorOnline: false,
            }));
            expect(result.mode).toBe('AUTONOMOUS');
            expect(result.reason).toContain('greeting_off_hours');
        });
    });
});
