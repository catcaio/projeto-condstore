import { freightService } from '@/modules/freight/freight.service';
import { logger } from '@/infra/logger';
import { adminAuditLogRepository } from '@/infra/repositories/admin-audit-log.repository';
import { createOrderFromQuoteTool, type CreateOrderFromQuoteParams } from './create-order-from-quote.tool';
import { getOrderStatusTool, type GetOrderStatusParams, type OrderStatusResult } from './read-only/getOrderStatus.tool';
import { getShipmentStatusTool, type GetShipmentStatusParams, type ShipmentStatusResult } from './read-only/getShipmentStatus.tool';
import { getRecentOrdersTool, type GetRecentOrdersParams, type RecentOrderSummary } from './read-only/getRecentOrders.tool';
import { getRecentQuotesTool, type GetRecentQuotesParams, type RecentQuoteSummary } from './read-only/getRecentQuotes.tool';
import { getCustomerContextTool, type GetCustomerContextParams, type CustomerContextToolResult } from './read-only/getCustomerContext.tool';
import {
    evaluateFrankToolPolicy,
    type FrankToolAction,
    type FrankToolPolicyContext,
    type FrankToolRiskLevel,
} from './tool-policy';

interface RunnerInputMap {
    freight_calculation: {
        tenantId: string;
        productId: string;
        quantity: number;
        destinationZip: string;
    };
    create_quote: {
        tenantId: string;
        productId: string;
        quantity: number;
        destinationZip: string;
    };
    create_order_from_quote: CreateOrderFromQuoteParams;
    get_order_status: GetOrderStatusParams;
    get_shipment_status: GetShipmentStatusParams;
    get_recent_orders: GetRecentOrdersParams;
    get_recent_quotes: GetRecentQuotesParams;
    get_customer_context: GetCustomerContextParams;
}

interface RunnerOutputMap {
    freight_calculation: Awaited<ReturnType<typeof freightService.simulateFreight>>;
    create_quote: Awaited<ReturnType<typeof freightService.simulateFreight>>;
    create_order_from_quote: Awaited<ReturnType<typeof createOrderFromQuoteTool>>;
    get_order_status: OrderStatusResult | null;
    get_shipment_status: ShipmentStatusResult | null;
    get_recent_orders: RecentOrderSummary[];
    get_recent_quotes: RecentQuoteSummary[];
    get_customer_context: CustomerContextToolResult | null;
}

export interface ToolRunnerContext extends FrankToolPolicyContext {}

export interface ToolRunnerError {
    code: 'POLICY_BLOCKED' | 'TOOL_EXECUTION_FAILED';
    message: string;
    details?: Record<string, unknown>;
}

export interface ToolResult<T> {
    ok: boolean;
    action: FrankToolAction;
    riskLevel: FrankToolRiskLevel;
    requestId: string;
    durationMs: number;
    data: T | null;
    error: ToolRunnerError | null;
}

function sanitizeTelemetryInput(input: unknown): unknown {
    if (!input || typeof input !== 'object') {
        return input;
    }

    const redactedKeys = new Set(['customerId', 'organizationId']);
    const source = input as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(source)) {
        sanitized[key] = redactedKeys.has(key) ? '[REDACTED]' : value;
    }

    return sanitized;
}

export async function runTool<TAction extends FrankToolAction>(
    action: TAction,
    input: RunnerInputMap[TAction],
    context: ToolRunnerContext,
): Promise<ToolResult<RunnerOutputMap[TAction]>> {
    const startedAt = Date.now();
    const decision = evaluateFrankToolPolicy(action, context, {
        targetTenantId: extractTenantId(input),
    });

    if (!decision.allowed) {
        const durationMs = Date.now() - startedAt;
        const result: ToolResult<RunnerOutputMap[TAction]> = {
            ok: false,
            action,
            riskLevel: decision.riskLevel,
            requestId: context.requestId,
            durationMs,
            data: null,
            error: {
                code: 'POLICY_BLOCKED',
                message: 'Tool execution blocked by policy layer.',
                details: { reason: decision.reason },
            },
        };

        logger.warn('frank_tool_runner_completed', {
            tenantId: context.tenantId,
            requestId: context.requestId,
            action,
            input: sanitizeTelemetryInput(input),
            result: { ok: false, errorCode: result.error?.code },
            durationMs,
        });

        if (decision.riskLevel === 'HIGH_RISK') {
            await adminAuditLogRepository.log({
                tenantId: context.tenantId,
                userId: 'frank-agent',
                action: `frank_tool_${action}`,
                metadata: {
                    riskLevel: decision.riskLevel,
                    approved: decision.allowed,
                    blocked: !decision.allowed,
                    reason: decision.reason ?? null,
                    tokenReference: context.humanApprovalToken ?? null,
                }
            }).catch(e => logger.error('Failed to write admin audit log', e as Error));
        }

        return result;
    }

    try {
        const data = await executeToolAction(action, input);
        const durationMs = Date.now() - startedAt;

        logger.info('frank_tool_runner_completed', {
            tenantId: context.tenantId,
            requestId: context.requestId,
            action,
            input: sanitizeTelemetryInput(input),
            result: { ok: true },
            durationMs,
        });

        if (decision.riskLevel === 'HIGH_RISK') {
            await adminAuditLogRepository.log({
                tenantId: context.tenantId,
                userId: 'frank-agent',
                action: `frank_tool_${action}`,
                metadata: {
                    riskLevel: decision.riskLevel,
                    approved: decision.allowed,
                    blocked: !decision.allowed,
                    reason: decision.reason ?? null,
                    tokenReference: context.humanApprovalToken ?? null,
                }
            }).catch(e => logger.error('Failed to write admin audit log', e as Error));
        }

        return {
            ok: true,
            action,
            riskLevel: decision.riskLevel,
            requestId: context.requestId,
            durationMs,
            data,
            error: null,
        };
    } catch (error) {
        const durationMs = Date.now() - startedAt;
        const message = error instanceof Error ? error.message : 'Unknown tool execution error';

        logger.error('frank_tool_runner_failed', error as Error, {
            tenantId: context.tenantId,
            requestId: context.requestId,
            action,
            input: sanitizeTelemetryInput(input),
            durationMs,
        });

        return {
            ok: false,
            action,
            riskLevel: decision.riskLevel,
            requestId: context.requestId,
            durationMs,
            data: null,
            error: {
                code: 'TOOL_EXECUTION_FAILED',
                message,
            },
        };
    }
}

function extractTenantId(input: unknown): string | undefined {
    if (!input || typeof input !== 'object') {
        return undefined;
    }

    const maybeTenantId = (input as { tenantId?: unknown }).tenantId;
    return typeof maybeTenantId === 'string' && maybeTenantId.length > 0 ? maybeTenantId : undefined;
}

async function executeToolAction<TAction extends FrankToolAction>(
    action: TAction,
    input: RunnerInputMap[TAction],
): Promise<RunnerOutputMap[TAction]> {
    switch (action) {
        case 'freight_calculation':
        case 'create_quote':
            return freightService.simulateFreight(input as RunnerInputMap['freight_calculation']) as Promise<RunnerOutputMap[TAction]>;
        case 'create_order_from_quote':
            return createOrderFromQuoteTool(input as RunnerInputMap['create_order_from_quote']) as Promise<RunnerOutputMap[TAction]>;
        case 'get_order_status':
            return getOrderStatusTool(input as RunnerInputMap['get_order_status']) as Promise<RunnerOutputMap[TAction]>;
        case 'get_shipment_status':
            return getShipmentStatusTool(input as RunnerInputMap['get_shipment_status']) as Promise<RunnerOutputMap[TAction]>;
        case 'get_recent_orders':
            return getRecentOrdersTool(input as RunnerInputMap['get_recent_orders']) as Promise<RunnerOutputMap[TAction]>;
        case 'get_recent_quotes':
            return getRecentQuotesTool(input as RunnerInputMap['get_recent_quotes']) as Promise<RunnerOutputMap[TAction]>;
        case 'get_customer_context':
            return getCustomerContextTool(input as RunnerInputMap['get_customer_context']) as Promise<RunnerOutputMap[TAction]>;
        default: {
            const exhaustive: never = action;
            throw new Error(`Unsupported tool action: ${String(exhaustive)}`);
        }
    }
}
