
import { describe, it, expect, beforeEach } from 'vitest';
import { IntentRouter, RouterContext } from '../intent-router';
import { IntentType, ActionType } from '../intents';

describe('IntentRouter', () => {
    let router: IntentRouter;
    const context: RouterContext = {
        tenantId: 'test-tenant',
        messageId: 'msg-123',
        fromNumber: '5511999999999',
        text: 'test text'
    };

    beforeEach(() => {
        router = new IntentRouter();
    });

    it('should route FREIGHT_QUOTE as FREIGHT_QUOTE', async () => {
        const response = await router.route(IntentType.FREIGHT_QUOTE, context);
        expect(response.type).toBe(ActionType.FREIGHT_QUOTE);
        expect(response.payload.targetService).toBe('FreightService');
    });

    it('should route PRODUCT_INFO as PRODUCT_INFO', async () => {
        const response = await router.route(IntentType.PRODUCT_INFO, context);
        expect(response.type).toBe(ActionType.PRODUCT_INFO);
        expect(response.payload.message).toContain('Sou a IA');
    });

    it('should route HUMAN_HANDOFF as HUMAN_HANDOFF', async () => {
        const response = await router.route(IntentType.HUMAN_HANDOFF, context);
        expect(response.type).toBe(ActionType.HUMAN_HANDOFF);
        expect(response.payload.tags).toContain('atendimento_humano');
    });

    it('should route FALLBACK_HUMAN as FALLBACK', async () => {
        const response = await router.route(IntentType.FALLBACK_HUMAN, context);
        expect(response.type).toBe(ActionType.FALLBACK);
        expect(response.payload.tags).toContain('fallback');
    });

    it('should route UNKNOWN as FALLBACK', async () => {
        const response = await router.route(IntentType.UNKNOWN, context);
        expect(response.type).toBe(ActionType.FALLBACK);
    });
});
