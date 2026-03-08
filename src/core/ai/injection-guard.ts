import { structuredLogger } from '@/infra/log/logger';

export type InjectionRisk = 'none' | 'low' | 'high';

export interface InjectionGuardResult {
    detected: boolean;
    risk: InjectionRisk;
    /** Safe to log — does NOT contain the original input */
    matchedPattern?: string;
}

const HIGH_RISK_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /ignore\s+(all\s+)?previous\s+instructions/i, label: 'ignore_instructions' },
    { pattern: /override\s+(system|policy)/i, label: 'override_policy' },
    { pattern: /forget\s+(all\s+)?(your\s+)?instructions/i, label: 'forget_instructions' },
    { pattern: /you\s+are\s+an?\s+(admin|developer|root)/i, label: 'role_impersonation' },
    { pattern: /developer\s+message/i, label: 'developer_message' },
    { pattern: /override\s+system/i, label: 'override_system' },
];

const LOW_RISK_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /system\s+prompt/i, label: 'system_prompt_probe' },
    { pattern: /you\s+are\s+an?\s+ai/i, label: 'ai_identity_probe' },
    { pattern: /act\s+as\s+/i, label: 'act_as_probe' },
    { pattern: /\bdan\b/i, label: 'dan_jailbreak' },
    { pattern: /disregard/i, label: 'disregard' },
    { pattern: /you\s+are\s+chatgpt/i, label: 'chatgpt_probe' },
];

export class InjectionGuard {
    /**
     * Analyzes input text for prompt injection attempts.
     * Returns risk level and matched pattern label (safe to log).
     */
    public analyze(text: string): InjectionGuardResult {
        if (!text) return { detected: false, risk: 'none' };

        for (const { pattern, label } of HIGH_RISK_PATTERNS) {
            if (pattern.test(text)) {
                return { detected: true, risk: 'high', matchedPattern: label };
            }
        }

        for (const { pattern, label } of LOW_RISK_PATTERNS) {
            if (pattern.test(text)) {
                return { detected: true, risk: 'low', matchedPattern: label };
            }
        }

        return { detected: false, risk: 'none' };
    }

    /** @deprecated Use analyze() instead */
    public detectInjection(text: string): boolean {
        return this.analyze(text).detected;
    }
}

export const injectionGuard = new InjectionGuard();

/**
 * Applies enforcement policy based on injection guard result.
 *
 * - high risk → block (returns safe canned response)
 * - low risk → degrade (strips suspicious content, logs warning)
 * - none → pass through
 */
export function enforceInjectionPolicy(
    input: string,
    guardResult: InjectionGuardResult,
    context: { tenantId: string; route?: string },
): { action: 'allow' | 'degrade' | 'block'; sanitizedInput: string; blockedResponse?: string } {
    if (guardResult.risk === 'high') {
        structuredLogger.warn('injection_guard_blocked', {
            eventType: 'injection_guard',
            tenantId: context.tenantId,
            route: context.route,
            risk: 'high',
            matchedPattern: guardResult.matchedPattern,
        });
        return {
            action: 'block',
            sanitizedInput: '',
            blockedResponse: 'Não foi possível processar sua solicitação. Por favor, reformule sua pergunta.',
        };
    }

    if (guardResult.risk === 'low') {
        structuredLogger.info('injection_guard_degraded', {
            eventType: 'injection_guard',
            tenantId: context.tenantId,
            route: context.route,
            risk: 'low',
            matchedPattern: guardResult.matchedPattern,
        });
        // Strip the suspicious pattern from input
        let sanitized = input;
        for (const { pattern } of LOW_RISK_PATTERNS) {
            sanitized = sanitized.replace(pattern, '[REMOVED]');
        }
        return { action: 'degrade', sanitizedInput: sanitized.trim() };
    }

    return { action: 'allow', sanitizedInput: input };
}
