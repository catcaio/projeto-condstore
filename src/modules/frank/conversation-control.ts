/**
 * Frank Conversation Control Gate.
 *
 * Decides the operational mode for each conversation turn:
 * - SUPERVISED: Frank prepares data, human sends.
 * - ASSISTED: Frank responds automatically for simple informational queries.
 * - AUTONOMOUS: Frank responds alone when no operators are available (off-hours).
 *
 * Pure function — no I/O dependencies.
 */

import type { Intent } from './intent-resolver';
import type { ExtractedEntities } from './entity-resolver';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ConversationMode = 'SUPERVISED' | 'ASSISTED' | 'AUTONOMOUS';

export interface ConversationGateInput {
    intent: Intent;
    entities: ExtractedEntities;
    confidence: number;
    timestamp: Date;
    operatorOnline: boolean;
    entitiesComplete: boolean;
    autoResponsesCount: number;
    messageBody: string;
}

export interface ConversationGateResult {
    mode: ConversationMode;
    reason: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SENSITIVE_INTENTS: Intent[] = [
    'CONFIRM_QUOTE',
    'CONFIRM_ORDER',
    'PAYMENT',
    'REQUEST_INVOICE',
    'REQUEST_BOLETO',
    'COMPLAINT',
    'PRICE_NEGOTIATION',
    'FRETE',
    'PRODUTO',
];

const INFORMATIONAL_INTENTS: Intent[] = [
    'ORDER_STATUS',
    'PEDIDO',
    'SHIPMENT_STATUS',
    'RECENT_ORDERS',
    'RECENT_QUOTES',
    'CUSTOMER_CONTEXT',
];

const ASSISTED_MIN_CONFIDENCE = 0.6;
const AUTONOMOUS_MIN_CONFIDENCE = 0.8;
const SUPERVISED_MAX_CONFIDENCE = 0.6;
const MAX_AUTO_RESPONSES = 5;

/** Business hours: 08:00–18:00 BRT, Monday–Friday. */
const BUSINESS_HOUR_START = 8;
const BUSINESS_HOUR_END = 18;

const FRUSTRATION_KEYWORDS = [
    'não foi isso',
    'nao foi isso',
    'não entendi',
    'nao entendi',
    'já falei',
    'ja falei',
    'você não respondeu',
    'voce nao respondeu',
    'não é isso',
    'nao e isso',
    'falar com alguém',
    'falar com alguem',
    'atendente',
    'humano',
    'pessoa',
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Check if a given timestamp falls within business hours (BRT).
 * Business hours: Monday–Friday, 08:00–18:00 America/Sao_Paulo.
 */
export function isBusinessHours(timestamp: Date): boolean {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo',
        hour: 'numeric',
        hour12: false,
        weekday: 'short',
    });

    const parts = formatter.formatToParts(timestamp);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
    const weekday = parts.find(p => p.type === 'weekday')?.value ?? '';

    const isWeekday = !['Sat', 'Sun'].includes(weekday);
    const isWithinHours = hour >= BUSINESS_HOUR_START && hour < BUSINESS_HOUR_END;

    return isWeekday && isWithinHours;
}

function isSensitiveIntent(intent: Intent): boolean {
    return SENSITIVE_INTENTS.includes(intent);
}

function isInformationalIntent(intent: Intent): boolean {
    return INFORMATIONAL_INTENTS.includes(intent);
}

function detectFrustration(message: string): boolean {
    const normalized = message.toLowerCase().trim();
    return FRUSTRATION_KEYWORDS.some((kw) => normalized.includes(kw));
}

// ─── Main Resolver ──────────────────────────────────────────────────────────

/**
 * Resolve conversation mode based on intent, confidence, entities, limits and operator presence.
 */
export function resolveConversationMode(input: ConversationGateInput): ConversationGateResult {
    const { intent, confidence, timestamp, operatorOnline, entitiesComplete, autoResponsesCount, messageBody } = input;
    const businessHours = isBusinessHours(timestamp);

    // Rule 1: Frustration — safe fallback to human
    if (detectFrustration(messageBody)) {
        return {
            mode: 'SUPERVISED',
            reason: 'frustration',
        };
    }

    // Rule 2: Auto-response loop prevention
    if (autoResponsesCount > MAX_AUTO_RESPONSES) {
        return {
            mode: 'SUPERVISED',
            reason: 'auto_response_limit',
        };
    }

    // Rule 3: Missing essential entities
    if (!entitiesComplete) {
        return {
            mode: 'SUPERVISED',
            reason: 'incomplete_entities',
        };
    }

    // Rule 4: Low confidence — always defer to human
    if (confidence < SUPERVISED_MAX_CONFIDENCE) {
        return {
            mode: 'SUPERVISED',
            reason: `confidence_below_threshold (${confidence})`,
        };
    }

    // Rule 5: Sensitive intent — always supervised
    if (isSensitiveIntent(intent)) {
        return {
            mode: 'SUPERVISED',
            reason: `sensitive_intent (${intent})`,
        };
    }

    // Rule 6: Informational intent with adequate confidence
    if (isInformationalIntent(intent) && confidence >= ASSISTED_MIN_CONFIDENCE) {
        // Off-hours + high confidence + NO operator = autonomous
        if (!businessHours && !operatorOnline && confidence >= AUTONOMOUS_MIN_CONFIDENCE) {
            return {
                mode: 'AUTONOMOUS',
                reason: `off_hours_informational (${intent}, confidence=${confidence})`,
            };
        }

        // If an operator is online, it's NEVER autonomous
        if (operatorOnline && !businessHours && confidence >= AUTONOMOUS_MIN_CONFIDENCE) {
            return {
                mode: 'ASSISTED',
                reason: `operator_online_override (${intent}, confidence=${confidence})`,
            };
        }

        // Business hours or moderate confidence → assisted
        return {
            mode: 'ASSISTED',
            reason: `informational_high_confidence (${intent}, confidence=${confidence})`,
        };
    }

    // Rule 7: SAUDACAO and OUTRO — safe defaults
    if (intent === 'SAUDACAO') {
        if (!businessHours && !operatorOnline) {
            return {
                mode: 'AUTONOMOUS',
                reason: 'greeting_off_hours',
            };
        }
        return {
            mode: 'ASSISTED',
            reason: `greeting (${businessHours ? 'business_hours' : 'operator_online'})`,
        };
    }

    // Default: supervised
    return {
        mode: 'SUPERVISED',
        reason: `default_supervised (${intent}, confidence=${confidence})`,
    };
}

