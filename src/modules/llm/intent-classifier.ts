
import { IntentType, BASELINE_KEYWORDS } from './intents';
import { logger } from '../../infra/logger';

export interface Prediction {
    intent: IntentType;
    confidence: number;
    method: 'baseline' | 'llm' | 'rate_limited';
    modelVersion: string;
    latencyMs: number;
    fallbackReason?: string | null;
}

export interface LLMProvider {
    predict(text: string): Promise<{ intent: IntentType; confidence: number }>;
}

class StubLLMProvider implements LLMProvider {
    async predict(text: string): Promise<{ intent: IntentType; confidence: number }> {
        // Stub implementation: always unknown with low confidence
        return { intent: IntentType.UNKNOWN, confidence: 0.1 };
    }
}

export class IntentClassifier {
    private llmProvider: LLMProvider;

    constructor(llmProvider?: LLMProvider) {
        this.llmProvider = llmProvider || new StubLLMProvider();
    }

    private rateLimit = new Map<string, number[]>();

    async classify(text: string, fromNumber?: string): Promise<Prediction> {
        const start = Date.now();
        const normalized = text.toLowerCase().trim();

        // 1. Baseline Strategy (Keywords)
        for (const [intent, keywords] of Object.entries(BASELINE_KEYWORDS)) {
            if (intent === IntentType.UNKNOWN || intent === IntentType.FALLBACK_HUMAN) continue;

            const match = keywords.some(keyword => normalized.includes(keyword));
            if (match) {
                return {
                    intent: intent as IntentType,
                    confidence: 1.0,
                    method: 'baseline',
                    modelVersion: 'v1-keyword',
                    latencyMs: Date.now() - start,
                };
            }
        }

        // 2. Feature Flag Check
        if (process.env.LLM_ENABLED !== 'true') {
            return {
                intent: IntentType.UNKNOWN, // Or FALLBACK_HUMAN? User said "if false -> only baseline". Baseline failed above, so return UNKNOWN.
                confidence: 0,
                method: 'baseline',
                modelVersion: 'disabled',
                latencyMs: Date.now() - start,
            };
        }

        // 3. Rate Limit Check (5/min per number)
        if (fromNumber) {
            const now = Date.now();
            const windowMs = 60 * 1000;
            const limit = 5;

            const timestamps = this.rateLimit.get(fromNumber) || [];
            const validTimestamps = timestamps.filter(t => now - t < windowMs);

            if (validTimestamps.length >= limit) {
                return {
                    intent: IntentType.FALLBACK_HUMAN,
                    confidence: 0,
                    method: 'rate_limited',
                    modelVersion: 'rate-limit',
                    latencyMs: Date.now() - start,
                    fallbackReason: 'RATE_LIMIT',
                };
            }

            validTimestamps.push(now);
            this.rateLimit.set(fromNumber, validTimestamps);
        }

        // 4. LLM Strategy (Stub)
        try {
            // Let's implement a simple wrapper `classifyWithGuardrails` that handles this? 
            // Or just put it here.

            const llmResult = await this.llmProvider.predict(text);
            let intent = llmResult.intent;
            let method: 'baseline' | 'llm' = 'llm';
            let confidence = llmResult.confidence;
            let fallbackReason = null;

            // 4. Guardrail: Confidence Check
            if (confidence < 0.65) {
                intent = IntentType.FALLBACK_HUMAN;
                fallbackReason = 'CONFIDENCE_LOW';
            }

            // 5. Guardrail: Enum Check
            if (!Object.values(IntentType).includes(intent)) {
                intent = IntentType.FALLBACK_HUMAN; // Or unknown
                fallbackReason = 'INVALID_INTENT';
            }

            return {
                intent,
                confidence,
                method: method,
                modelVersion: 'v1-stub',
                latencyMs: Date.now() - start,
                fallbackReason
            };
        } catch (error) {
            logger.error('LLM classification failed', error as Error);
            return {
                intent: IntentType.UNKNOWN,
                confidence: 0,
                method: 'baseline', // Fallback to baseline (unknown)
                modelVersion: 'fallback',
                latencyMs: Date.now() - start,
            };
        }
    }
}

export const intentClassifier = new IntentClassifier();
