import { freightService } from '@/modules/freight/freight.service';
import { createOrderFromQuoteTool, type CreateOrderFromQuoteParams } from './create-order-from-quote.tool';
import { getOrderStatusTool, type GetOrderStatusParams, type OrderStatusResult } from './read-only/getOrderStatus.tool';
import { getShipmentStatusTool, type GetShipmentStatusParams, type ShipmentStatusResult } from './read-only/getShipmentStatus.tool';
import { getRecentOrdersTool, type GetRecentOrdersParams, type RecentOrderSummary } from './read-only/getRecentOrders.tool';
import { getRecentQuotesTool, type GetRecentQuotesParams, type RecentQuoteSummary } from './read-only/getRecentQuotes.tool';
import { getCustomerContextTool, type GetCustomerContextParams, type CustomerContextToolResult } from './read-only/getCustomerContext.tool';
import {
    type FrankToolAction,
    type FrankToolPolicyContext,
    type FrankToolRiskLevel,
} from './tool-policy';
import { frankExecutionRuntime } from '../frank-execution-runtime';

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
    code: 'POLICY_BLOCKED' | 'TOOL_EXECUTION_FAILED' | string;
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

export async function runTool<TAction extends FrankToolAction>(
    action: TAction,
    input: RunnerInputMap[TAction & keyof RunnerInputMap],
    context: ToolRunnerContext,
): Promise<ToolResult<RunnerOutputMap[TAction & keyof RunnerOutputMap]>> {
    const runtimeResult = await frankExecutionRuntime.executeTool<unknown, RunnerOutputMap[TAction & keyof RunnerOutputMap]>({
        tenantId: context.tenantId,
        requestId: context.requestId,
        toolName: action,
        input,
        allowHighRisk: context.allowHighRisk,
        humanApprovalToken: context.humanApprovalToken,
    });

    return {
        ok: runtimeResult.ok,
        action,
        riskLevel: runtimeResult.riskLevel,
        requestId: context.requestId,
        durationMs: runtimeResult.durationMs,
        data: runtimeResult.data,
        error: runtimeResult.error ? {
            code: runtimeResult.error.code,
            message: runtimeResult.error.message,
            details: runtimeResult.error.details,
        } : null,
    };
}
