import { ConversationMode } from './conversation-control';

export interface AutoResponseGuardParams {
    autoResponsesCount: number;
    assignedTo?: string | null;
    status: string;
    operatorRespondedRecently?: boolean;
}

export interface AutoResponseGuardResult {
    blocked: boolean;
    reason?: 'auto_response_limit' | 'operator_present' | 'human_active';
    forcedMode?: ConversationMode;
}

const MAX_AUTO_RESPONSES = 2; // Maximum consecutive auto-replies allowed

/**
 * Evaluates whether Frank is stuck in an auto-response loop 
 * or if a human operator is currently presiding over the ticket.
 */
export function evaluateAutoResponseGuard(
    currentMode: ConversationMode, 
    params: AutoResponseGuardParams
): AutoResponseGuardResult {
    // 1. HUMAN_ACTIVE State
    if (params.status === 'HUMAN_ACTIVE') {
        return {
            blocked: true,
            reason: 'human_active',
            forcedMode: 'SUPERVISED'
        };
    }

    // 2. Operator Presence (Assigned or recently replied)
    if (params.assignedTo || params.operatorRespondedRecently) {
        return {
            blocked: true,
            reason: 'operator_present',
            forcedMode: 'SUPERVISED'
        };
    }

    // 3. Auto-Response Loop Limit
    if (params.autoResponsesCount >= MAX_AUTO_RESPONSES) {
        return {
            blocked: true,
            reason: 'auto_response_limit',
            forcedMode: 'SUPERVISED'
        };
    }

    // Pass-through
    return {
        blocked: false
    };
}
