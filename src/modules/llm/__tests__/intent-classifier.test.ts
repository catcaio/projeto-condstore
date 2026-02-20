
import { describe, it, expect, beforeEach } from 'vitest';
import { IntentClassifier } from '../intent-classifier';
import { IntentType } from '../intents';

describe('IntentClassifier', () => {
    let classifier: IntentClassifier;

    beforeEach(() => {
        process.env.LLM_ENABLED = 'true';
        classifier = new IntentClassifier();
    });

    it('should classify greeting keywords correctly', async () => {
        const result = await classifier.classify('olá bom dia');
        expect(result.intent).toBe(IntentType.GREETING);
        expect(result.method).toBe('baseline');
        expect(result.confidence).toBe(1.0);
    });

    it('should classify freight quote keywords correctly', async () => {
        const result = await classifier.classify('quanto custa o frete para 12345-678');
        expect(result.intent).toBe(IntentType.FREIGHT_QUOTE);
        expect(result.method).toBe('baseline');
    });

    it('should classify order status keywords correctly', async () => {
        const result = await classifier.classify('onde está meu pedido');
        expect(result.intent).toBe(IntentType.ORDER_STATUS);
    });

    it('should classify human handoff keywords correctly', async () => {
        const result = await classifier.classify('quero falar com um humano');
        expect(result.intent).toBe(IntentType.HUMAN_HANDOFF);
    });

    it('should fallback to human if confidence is low', async () => {
        // Mock LLM provider to return low confidence
        const mockProvider = {
            predict: async () => ({
                intent: IntentType.ORDER_STATUS,
                confidence: 0.5, // < 0.65
            })
        };
        (classifier as any).llmProvider = mockProvider;

        const result = await classifier.classify('some ambiguous text');
        expect(result.intent).toBe(IntentType.FALLBACK_HUMAN);
        expect(result.fallbackReason).toBe('CONFIDENCE_LOW');
    });

    it('should rate limit frequent requests from same number', async () => {
        const number = '5511999999999';
        // 5 allowed (must not match keywords to reach LLM/RateLimit logic)
        for (let i = 0; i < 5; i++) {
            const result = await classifier.classify('random text for llm', number);
            expect(result.method).not.toBe('rate_limited');
        }

        // 6th should fail
        const result = await classifier.classify('random text for llm', number);
        expect(result.method).toBe('rate_limited');
        expect(result.intent).toBe(IntentType.FALLBACK_HUMAN);
        expect(result.fallbackReason).toBe('RATE_LIMIT');
    });

    it('should fallback to stub LLM (unknown) for unrecognized text', async () => {
        const result = await classifier.classify('nada a ver com nada');
        expect(result.intent).toBe(IntentType.FALLBACK_HUMAN);
        expect(result.method).toBe('llm');
        expect(result.fallbackReason).toBe('CONFIDENCE_LOW'); // Stub returns 0 or low conf for unknown
    });
});
