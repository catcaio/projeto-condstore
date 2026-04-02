import { freightService } from '@/modules/freight/freight.service';
import { structuredLogger } from '@/infra/log/logger';
import { createOrderFromQuoteTool, type CreateOrderFromQuoteParams } from './create-order-from-quote.tool';
import { getOrderStatusTool, type GetOrderStatusParams, type OrderStatusResult } from './read-only/getOrderStatus.tool';
import { getShipmentStatusTool, type GetShipmentStatusParams, type ShipmentStatusResult } from './read-only/getShipmentStatus.tool';
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
}

interface RunnerOutputMap {
    freight_calculation: Awaited<ReturnType<typeof freightService.simulateFreight>>;
    create_quote: Awaited<ReturnType<typeof freightService.simulateFreight>>;
    create_order_from_quote: Awaited<ReturnType<typeof createOrderFromQuoteTool>>;
    get_order_status: OrderStatusResult | null;
    get_shipment_status: ShipmentStatusResult | null;
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
    const decision = evaluateFrankToolPolicy(action, context);

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

        structuredLogger.warn('frank_tool_runner_completed', {
            tenantId: context.tenantId,
            requestId: context.requestId,
            action,
            input: sanitizeTelemetryInput(input),
            result: { ok: false, errorCode: result.error?.code },
            durationMs,
        });

        return result;
    }

    try {
        const data = await executeToolAction(action, input);
        const durationMs = Date.now() - startedAt;

        structuredLogger.info('frank_tool_runner_completed', {
            tenantId: context.tenantId,
            requestId: context.requestId,
            action,
            input: sanitizeTelemetryInput(input),
            result: { ok: true },
            durationMs,
        });

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

        structuredLogger.error('frank_tool_runner_failed', {
            tenantId: context.tenantId,
            requestId: context.requestId,
            action,
            input: sanitizeTelemetryInput(input),
            durationMs,
            error,
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
        default: {
            const exhaustive: never = action;
            throw new Error(`Unsupported tool action: ${String(exhaustive)}`);
        }
    }
}
