import { logger } from '@/infra/logger';

export type ToolResult = {
    ok: boolean;
    status: string;
    data?: unknown;
    errorCode?: string;
    errorMessage?: string;
    audit?: Record<string, unknown>;
    nextAllowedActions?: string[];
};

export type FrankRiskLevel = 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK';

export type FrankAgentAction =
    | 'READ_CONVERSATION_CONTEXT'
    | 'READ_CUSTOMER_CRM_CONTEXT'
    | 'READ_QUOTE_CONTEXT'
    | 'REQUEST_QUOTE_APPROVAL'
    | 'TRACK_SHIPMENT_STATUS'
    | 'CREATE_ORDER_FROM_ACCEPTED_QUOTE';

export type FrankSubAgent = 'ATENDIMENTO' | 'CRM' | 'FREIGHT' | 'LOGISTICA';

export interface FrankAgentState {
    flowState: string;
    quoteStatus: string | null;
    lastActionExecuted: FrankAgentAction | null;
    lastBlockReason: string | null;
}

export interface FrankPolicyInput {
    action: FrankAgentAction;
    quoteStatus: string | null;
}

export interface FrankPolicyDecision {
    riskLevel: FrankRiskLevel;
    allowed: boolean;
    reason?: string;
    nextAllowedActions: FrankAgentAction[];
}

export interface FrankPlannerInput {
    requestedAction: FrankAgentAction;
}

export interface FrankPlanDecision {
    action: FrankAgentAction;
    subAgent: FrankSubAgent;
    handoff?: string;
}

const ACTION_RISK_MAP: Record<FrankAgentAction, FrankRiskLevel> = {
    READ_CONVERSATION_CONTEXT: 'LOW_RISK',
    READ_CUSTOMER_CRM_CONTEXT: 'LOW_RISK',
    READ_QUOTE_CONTEXT: 'LOW_RISK',
    REQUEST_QUOTE_APPROVAL: 'HIGH_RISK',
    TRACK_SHIPMENT_STATUS: 'MEDIUM_RISK',
    CREATE_ORDER_FROM_ACCEPTED_QUOTE: 'HIGH_RISK',
};

const ACTION_SUB_AGENT_MAP: Record<FrankAgentAction, FrankSubAgent> = {
    READ_CONVERSATION_CONTEXT: 'ATENDIMENTO',
    READ_CUSTOMER_CRM_CONTEXT: 'CRM',
    READ_QUOTE_CONTEXT: 'FREIGHT',
    REQUEST_QUOTE_APPROVAL: 'FREIGHT',
    TRACK_SHIPMENT_STATUS: 'LOGISTICA',
    CREATE_ORDER_FROM_ACCEPTED_QUOTE: 'LOGISTICA',
};

export function decideNextAction(input: FrankPlannerInput, state: FrankAgentState): FrankPlanDecision {
    if (input.requestedAction === 'CREATE_ORDER_FROM_ACCEPTED_QUOTE' && state.quoteStatus !== 'ACCEPTED') {
        return {
            action: 'CREATE_ORDER_FROM_ACCEPTED_QUOTE',
            subAgent: 'FREIGHT',
            handoff: 'Aguardando quote aprovada; logística depende de precondição do Freight.',
        };
    }

    return {
        action: input.requestedAction,
        subAgent: ACTION_SUB_AGENT_MAP[input.requestedAction],
    };
}

function resolveNextAllowedActions(quoteStatus: string | null): FrankAgentAction[] {
    if (quoteStatus === 'ACCEPTED') {
        return ['READ_QUOTE_CONTEXT', 'CREATE_ORDER_FROM_ACCEPTED_QUOTE'];
    }

    if (quoteStatus === 'SENT' || quoteStatus === 'DRAFT') {
        return ['READ_QUOTE_CONTEXT', 'REQUEST_QUOTE_APPROVAL'];
    }

    return ['READ_QUOTE_CONTEXT'];
}

export function evaluatePolicy(input: FrankPolicyInput): FrankPolicyDecision {
    const riskLevel = ACTION_RISK_MAP[input.action];
    const nextAllowedActions = resolveNextAllowedActions(input.quoteStatus);

    if (input.action === 'REQUEST_QUOTE_APPROVAL' && !input.quoteStatus) {
        return {
            riskLevel,
            allowed: false,
            reason: 'Ação bloqueada: cotação inexistente para solicitar aprovação.',
            nextAllowedActions,
        };
    }

    if (input.action === 'CREATE_ORDER_FROM_ACCEPTED_QUOTE' && input.quoteStatus !== 'ACCEPTED') {
        return {
            riskLevel,
            allowed: false,
            reason: 'A cotacao precisa estar aprovada antes de criar o pedido.',
            nextAllowedActions,
        };
    }

    return {
        riskLevel,
        allowed: true,
        nextAllowedActions,
    };
}

export function buildAgentMemory(params: {
    quoteStatus: string | null;
    lastActionExecuted?: FrankAgentAction | null;
    lastBlockReason?: string | null;
}): FrankAgentState {
    return {
        flowState: params.quoteStatus ?? 'UNKNOWN',
        quoteStatus: params.quoteStatus,
        lastActionExecuted: params.lastActionExecuted ?? null,
        lastBlockReason: params.lastBlockReason ?? null,
    };
}

export async function runFrankAgentTool(params: {
    requestId: string;
    action: FrankAgentAction;
    quoteStatus: string | null;
    execute: () => Promise<unknown>;
}): Promise<ToolResult> {
    const start = Date.now();

    const memory = buildAgentMemory({ quoteStatus: params.quoteStatus });
    const planned = decideNextAction({ requestedAction: params.action }, memory);
    const policy = evaluatePolicy({ action: planned.action, quoteStatus: params.quoteStatus });

    if (!policy.allowed) {
        const blockedMemory = buildAgentMemory({
            quoteStatus: params.quoteStatus,
            lastActionExecuted: null,
            lastBlockReason: policy.reason ?? null,
        });

        const blockedResult: ToolResult = {
            ok: false,
            status: 'BLOCKED_BY_POLICY',
            errorCode: 'POLICY_BLOCKED',
            errorMessage: policy.reason,
            nextAllowedActions: policy.nextAllowedActions,
            audit: {
                riskLevel: policy.riskLevel,
                subAgent: planned.subAgent,
                handoff: planned.handoff ?? null,
                flowState: blockedMemory.flowState,
                lastActionExecuted: blockedMemory.lastActionExecuted,
                lastBlockReason: blockedMemory.lastBlockReason,
            },
        };

        logger.warn('frank_agent_loop_execution_blocked', {
            requestId: params.requestId,
            action: planned.action,
            subAgent: planned.subAgent,
            handoff: planned.handoff ?? null,
            outcome: blockedResult.status,
            reason: blockedResult.errorMessage,
            riskLevel: policy.riskLevel,
            durationMs: Date.now() - start,
        });

        return blockedResult;
    }

    try {
        const data = await params.execute();
        const doneMemory = buildAgentMemory({
            quoteStatus: params.quoteStatus,
            lastActionExecuted: planned.action,
        });

        const success: ToolResult = {
            ok: true,
            status: 'EXECUTED',
            data,
            nextAllowedActions: policy.nextAllowedActions,
            audit: {
                riskLevel: policy.riskLevel,
                subAgent: planned.subAgent,
                handoff: planned.handoff ?? null,
                flowState: doneMemory.flowState,
                lastActionExecuted: doneMemory.lastActionExecuted,
            },
        };

        logger.info('frank_agent_loop_execution', {
            requestId: params.requestId,
            action: planned.action,
            subAgent: planned.subAgent,
            handoff: planned.handoff ?? null,
            outcome: success.status,
            riskLevel: policy.riskLevel,
            durationMs: Date.now() - start,
        });

        return success;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected tool error';
        const failed: ToolResult = {
            ok: false,
            status: 'FAILED',
            errorCode: 'TOOL_EXECUTION_FAILED',
            errorMessage: message,
            nextAllowedActions: policy.nextAllowedActions,
            audit: {
                riskLevel: policy.riskLevel,
                subAgent: planned.subAgent,
                handoff: planned.handoff ?? null,
                flowState: memory.flowState,
                lastActionExecuted: planned.action,
            },
        };

        logger.info('frank_agent_loop_execution', {
            requestId: params.requestId,
            action: planned.action,
            subAgent: planned.subAgent,
            handoff: planned.handoff ?? null,
            outcome: failed.status,
            riskLevel: policy.riskLevel,
            durationMs: Date.now() - start,
        });

        return failed;
    }
}
