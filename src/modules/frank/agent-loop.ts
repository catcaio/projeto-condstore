import { logger } from '@/infra/logger';
import { adminAuditLogRepository } from '@/infra/repositories/admin-audit-log.repository';

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
    tenantId?: string;
    humanApprovalToken?: string;
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
    REQUEST_QUOTE_APPROVAL: 'MEDIUM_RISK',
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

export function evaluatePolicy(input: FrankPolicyInput): FrankPolicyDecision {
    const riskLevel = ACTION_RISK_MAP[input.action];

    if (riskLevel === 'HIGH_RISK') {
        const hasToken = input.humanApprovalToken && input.humanApprovalToken.trim().length > 0;
        if (!hasToken) {
            return {
                riskLevel,
                allowed: false,
                reason: 'missing_human_approval_token',
                nextAllowedActions: ['READ_QUOTE_CONTEXT', 'REQUEST_QUOTE_APPROVAL', 'READ_CUSTOMER_CRM_CONTEXT'],
            };
        }

        if (input.quoteStatus !== 'ACCEPTED') {
            return {
                riskLevel,
                allowed: false,
                reason: 'A cotacao precisa estar aprovada antes de criar o pedido.',
                nextAllowedActions: ['READ_QUOTE_CONTEXT', 'REQUEST_QUOTE_APPROVAL', 'READ_CUSTOMER_CRM_CONTEXT'],
            };
        }
    }

    return {
        riskLevel,
        allowed: true,
        nextAllowedActions: [
            'READ_CONVERSATION_CONTEXT',
            'READ_CUSTOMER_CRM_CONTEXT',
            'READ_QUOTE_CONTEXT',
            'REQUEST_QUOTE_APPROVAL',
            'TRACK_SHIPMENT_STATUS',
            'CREATE_ORDER_FROM_ACCEPTED_QUOTE',
        ],
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
    tenantId: string;
    humanApprovalToken?: string;
    requestId: string;
    action: FrankAgentAction;
    quoteStatus: string | null;
    execute: () => Promise<unknown>;
}): Promise<ToolResult> {
    const start = Date.now();

    const memory = buildAgentMemory({ quoteStatus: params.quoteStatus });
    const planned = decideNextAction({ requestedAction: params.action }, memory);
    const policy = evaluatePolicy({ 
        action: planned.action, 
        quoteStatus: params.quoteStatus,
        tenantId: params.tenantId,
        humanApprovalToken: params.humanApprovalToken,
    });

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

        logger.info('frank_agent_loop_execution', {
            requestId: params.requestId,
            action: planned.action,
            subAgent: planned.subAgent,
            handoff: planned.handoff ?? null,
            outcome: blockedResult.status,
            durationMs: Date.now() - start,
        });

        if (policy.riskLevel === 'HIGH_RISK') {
            await adminAuditLogRepository.log({
                tenantId: params.tenantId,
                userId: 'frank-agent',
                action: `frank_agent_${planned.action}`,
                metadata: {
                    riskLevel: policy.riskLevel,
                    approved: false,
                    blocked: true,
                    reason: policy.reason ?? null,
                    tokenReference: params.humanApprovalToken ?? null,
                }
            }).catch(e => logger.error('Failed to write admin audit log', e as Error));
        }

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
            durationMs: Date.now() - start,
        });

        if (policy.riskLevel === 'HIGH_RISK') {
            await adminAuditLogRepository.log({
                tenantId: params.tenantId,
                userId: 'frank-agent',
                action: `frank_agent_${planned.action}`,
                metadata: {
                    riskLevel: policy.riskLevel,
                    approved: true,
                    blocked: false,
                    reason: null,
                    tokenReference: params.humanApprovalToken ?? null,
                }
            }).catch(e => logger.error('Failed to write admin audit log', e as Error));
        }

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
            durationMs: Date.now() - start,
        });

        return failed;
    }
}
