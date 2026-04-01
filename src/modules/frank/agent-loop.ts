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
    | 'READ_QUOTE_CONTEXT'
    | 'REQUEST_QUOTE_APPROVAL'
    | 'CREATE_ORDER_FROM_ACCEPTED_QUOTE';

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

const ACTION_RISK_MAP: Record<FrankAgentAction, FrankRiskLevel> = {
    READ_QUOTE_CONTEXT: 'LOW_RISK',
    REQUEST_QUOTE_APPROVAL: 'MEDIUM_RISK',
    CREATE_ORDER_FROM_ACCEPTED_QUOTE: 'HIGH_RISK',
};

export function decideNextAction(input: FrankPlannerInput, state: FrankAgentState): FrankAgentAction {
    if (input.requestedAction === 'CREATE_ORDER_FROM_ACCEPTED_QUOTE' && state.quoteStatus !== 'ACCEPTED') {
        return 'CREATE_ORDER_FROM_ACCEPTED_QUOTE';
    }

    return input.requestedAction;
}

export function evaluatePolicy(input: FrankPolicyInput): FrankPolicyDecision {
    const riskLevel = ACTION_RISK_MAP[input.action];

    if (riskLevel === 'HIGH_RISK' && input.quoteStatus !== 'ACCEPTED') {
        return {
            riskLevel,
            allowed: false,
            reason: 'A cotacao precisa estar aprovada antes de criar o pedido.',
            nextAllowedActions: ['READ_QUOTE_CONTEXT', 'REQUEST_QUOTE_APPROVAL'],
        };
    }

    return {
        riskLevel,
        allowed: true,
        nextAllowedActions: ['READ_QUOTE_CONTEXT', 'REQUEST_QUOTE_APPROVAL', 'CREATE_ORDER_FROM_ACCEPTED_QUOTE'],
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
    const plannedAction = decideNextAction({ requestedAction: params.action }, memory);
    const policy = evaluatePolicy({ action: plannedAction, quoteStatus: params.quoteStatus });

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
                flowState: blockedMemory.flowState,
                lastActionExecuted: blockedMemory.lastActionExecuted,
                lastBlockReason: blockedMemory.lastBlockReason,
            },
        };

        logger.info('frank_agent_loop_execution', {
            requestId: params.requestId,
            action: plannedAction,
            outcome: blockedResult.status,
            durationMs: Date.now() - start,
        });

        return blockedResult;
    }

    try {
        const data = await params.execute();
        const doneMemory = buildAgentMemory({
            quoteStatus: params.quoteStatus,
            lastActionExecuted: plannedAction,
        });

        const success: ToolResult = {
            ok: true,
            status: 'EXECUTED',
            data,
            nextAllowedActions: policy.nextAllowedActions,
            audit: {
                riskLevel: policy.riskLevel,
                flowState: doneMemory.flowState,
                lastActionExecuted: doneMemory.lastActionExecuted,
            },
        };

        logger.info('frank_agent_loop_execution', {
            requestId: params.requestId,
            action: plannedAction,
            outcome: success.status,
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
                flowState: memory.flowState,
                lastActionExecuted: plannedAction,
            },
        };

        logger.info('frank_agent_loop_execution', {
            requestId: params.requestId,
            action: plannedAction,
            outcome: failed.status,
            durationMs: Date.now() - start,
        });

        return failed;
    }
}
