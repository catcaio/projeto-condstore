import { createOrderFromSimulation } from '../../pedidos/order.service';
import { logger } from '@/infra/logger';

export interface CreateOrderFromQuoteParams {
    tenantId: string;
    simulationId: string;
    customerId: string; // The canonical customer ID (owner)
    organizationId: string; // The Canonical organization ID
    items: Array<{
        name: string;
        sku?: string;
        quantity: number;
        unitPrice: number;
    }>;
}

/**
 * Frank Tool: createOrderFromQuoteTool
 *
 * Exposes the internal CRM order creation service to the AI Agent / Orchestrator.
 * Designed to be safely called from conversational flows when a customer confirms a quote.
 */
export async function createOrderFromQuoteTool(params: CreateOrderFromQuoteParams) {
    logger.info('frank_tool_executing_create_order', {
        tenantId: params.tenantId,
        simulationId: params.simulationId,
    });

    try {
        const orderResult = await createOrderFromSimulation({
            tenantId: params.tenantId,
            simulationId: params.simulationId,
            customerId: params.customerId,
            organizationId: params.organizationId,
            createdBy: 'FRANK_AI_AGENT', // Tagging the creator for audit logs
            items: params.items,
        });

        logger.info('frank_tool_order_created', {
            tenantId: params.tenantId,
            orderId: orderResult.orderId,
        });

        return orderResult;
    } catch (error: any) {
        logger.error('frank_tool_order_creation_failed', error as Error, {
            tenantId: params.tenantId,
            simulationId: params.simulationId,
        });
        throw new Error(`Failed to create order from quote: ${error?.message}`);
    }
}
