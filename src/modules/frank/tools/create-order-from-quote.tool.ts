import { z } from 'zod';
import { createOrderFromSimulation } from '../../pedidos/order.service';
import { logger } from '@/infra/logger';
import { executeFrankTool } from './tool-guard';
import { FrankToolContract } from './frank-tool.contract';
import { frankToolRegistry } from './frank-tool.registry';

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

export const createOrderFromQuoteInputSchema = z.object({
    tenantId: z.string().min(1, 'tenantId is required'),
    simulationId: z.string().min(1, 'simulationId is required'),
    customerId: z.string().min(1, 'customerId is required'),
    organizationId: z.string().min(1, 'organizationId is required'),
    items: z.array(z.object({
        name: z.string().min(1),
        sku: z.string().optional(),
        quantity: z.number().positive(),
        unitPrice: z.number().nonnegative(),
    })).min(1, 'At least one item is required'),
});

export const createOrderFromQuoteOutputSchema: z.ZodType<Awaited<ReturnType<typeof createOrderFromSimulation>>> = z.object({
    orderId: z.string().min(1) as unknown as z.ZodType<`${string}-${string}-${string}-${string}-${string}`>,
    status: z.string().min(1),
    shipmentLink: z.string().min(1),
}) as unknown as z.ZodType<Awaited<ReturnType<typeof createOrderFromSimulation>>>;

export const createOrderFromQuoteContract: FrankToolContract<CreateOrderFromQuoteParams, Awaited<ReturnType<typeof createOrderFromSimulation>>> = {
    name: 'create_order_from_quote',
    description: 'Creates an official customer order from an accepted quote simulation.',
    inputSchema: createOrderFromQuoteInputSchema,
    outputSchema: createOrderFromQuoteOutputSchema,
    isReadOnly: false,
    riskClass: 'CRITICAL',
    capabilities: ['WRITE', 'CREATE', 'FINANCIAL'],
    sideEffects: ['STATE_MUTATION', 'PERSISTENCE_WRITE'],
    execute: async (input) => {
        return createOrderFromQuoteTool(input);
    },
};

frankToolRegistry.registerTool(createOrderFromQuoteContract);

/**
 * Frank Tool: createOrderFromQuoteTool
 *
 * Exposes the internal CRM order creation service to the AI Agent / Orchestrator.
 * Designed to be safely called from conversational flows when a customer confirms a quote.
 */
export async function createOrderFromQuoteTool(params: CreateOrderFromQuoteParams) {
    return executeFrankTool({
        tenantId: params.tenantId,
        toolName: 'create_order_from_quote',
        access: 'mutation',
        run: async () => {
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
        },
    });
}
