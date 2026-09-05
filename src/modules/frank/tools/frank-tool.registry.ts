import { z } from 'zod';
import { FrankToolContract, validateToolContractInvariants } from './frank-tool.contract';
import { logger } from '@/infra/logger';

export class FrankToolNotFoundError extends Error {
    constructor(public readonly toolName: string) {
        super(`Frank Tool [${toolName}] is not registered in the canonical Tool Registry.`);
        this.name = 'FrankToolNotFoundError';
    }
}

export class FrankToolRegistry {
    private readonly tools = new Map<string, FrankToolContract<any, any>>();

    constructor() {
        this.registerDefaultTools();
    }

    /**
     * Registers default canonical Frank tool contracts with lazy execution resolvers.
     */
    public registerDefaultTools(): void {
        // 1. freight_calculation
        this.registerTool({
            name: 'freight_calculation',
            description: 'Calculates freight quote and delivery options for a given product and destination ZIP code.',
            inputSchema: z.object({
                tenantId: z.string().min(1, 'tenantId is required'),
                productId: z.string().min(1, 'productId is required'),
                quantity: z.number().int().positive('quantity must be positive'),
                destinationZip: z.string().min(1, 'destinationZip is required'),
            }),
            outputSchema: z.any(),
            isReadOnly: true,
            riskClass: 'SAFE',
            capabilities: ['READ', 'QUERY'],
            sideEffects: ['NONE'],
            execute: async (input) => {
                const { freightService } = await import('@/modules/freight/freight.service');
                return freightService.simulateFreight(input as any);
            },
        });

        // 2. create_quote
        this.registerTool({
            name: 'create_quote',
            description: 'Generates an official freight quote option for customer confirmation.',
            inputSchema: z.object({
                tenantId: z.string().min(1, 'tenantId is required'),
                productId: z.string().min(1, 'productId is required'),
                quantity: z.number().int().positive('quantity must be positive'),
                destinationZip: z.string().min(1, 'destinationZip is required'),
            }),
            outputSchema: z.any(),
            isReadOnly: false,
            riskClass: 'GUARDED',
            capabilities: ['WRITE', 'CREATE', 'FINANCIAL'],
            sideEffects: ['PERSISTENCE_WRITE'],
            execute: async (input) => {
                const { freightService } = await import('@/modules/freight/freight.service');
                return freightService.simulateFreight(input as any);
            },
        });

        // 3. create_order_from_quote
        this.registerTool({
            name: 'create_order_from_quote',
            description: 'Creates an official customer order from an accepted quote simulation.',
            inputSchema: z.object({
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
            }),
            outputSchema: z.object({ orderId: z.string().min(1) }).passthrough(),
            isReadOnly: false,
            riskClass: 'CRITICAL',
            capabilities: ['WRITE', 'CREATE', 'FINANCIAL'],
            sideEffects: ['STATE_MUTATION', 'PERSISTENCE_WRITE'],
            execute: async (input) => {
                const { createOrderFromQuoteTool } = await import('./create-order-from-quote.tool');
                return createOrderFromQuoteTool(input as any);
            },
        });

        // 4. get_order_status
        this.registerTool({
            name: 'get_order_status',
            description: 'Fetches order details, status history, and linked shipment status.',
            inputSchema: z.object({
                tenantId: z.string().min(1, 'tenantId is required'),
                orderId: z.string().min(1, 'orderId is required'),
            }),
            outputSchema: z.any().nullable(),
            isReadOnly: true,
            riskClass: 'SAFE',
            capabilities: ['READ', 'QUERY'],
            sideEffects: ['NONE'],
            execute: async (input) => {
                const { getOrderStatusTool } = await import('./read-only/getOrderStatus.tool');
                return getOrderStatusTool(input as any);
            },
        });

        // 5. get_shipment_status
        this.registerTool({
            name: 'get_shipment_status',
            description: 'Fetches shipment details, carrier info, tracking token, and real-time delivery status.',
            inputSchema: z.object({
                tenantId: z.string().min(1, 'tenantId is required'),
                shipmentId: z.string().min(1, 'shipmentId is required'),
            }),
            outputSchema: z.any().nullable(),
            isReadOnly: true,
            riskClass: 'SAFE',
            capabilities: ['READ', 'QUERY'],
            sideEffects: ['NONE'],
            execute: async (input) => {
                const { getShipmentStatusTool } = await import('./read-only/getShipmentStatus.tool');
                return getShipmentStatusTool(input as any);
            },
        });

        // 6. get_recent_orders
        this.registerTool({
            name: 'get_recent_orders',
            description: 'Retrieves recent orders for a given customer with linked shipments.',
            inputSchema: z.object({
                tenantId: z.string().min(1, 'tenantId is required'),
                customerId: z.string().min(1, 'customerId is required'),
                limit: z.number().int().positive().optional(),
            }),
            outputSchema: z.array(z.any()),
            isReadOnly: true,
            riskClass: 'SAFE',
            capabilities: ['READ', 'QUERY'],
            sideEffects: ['NONE'],
            execute: async (input) => {
                const { getRecentOrdersTool } = await import('./read-only/getRecentOrders.tool');
                return getRecentOrdersTool(input as any);
            },
        });

        // 7. get_recent_quotes
        this.registerTool({
            name: 'get_recent_quotes',
            description: 'Retrieves recent quotes and simulation history for a given customer.',
            inputSchema: z.object({
                tenantId: z.string().min(1, 'tenantId is required'),
                customerId: z.string().min(1, 'customerId is required'),
                limit: z.number().int().positive().optional(),
            }),
            outputSchema: z.array(z.any()),
            isReadOnly: true,
            riskClass: 'SAFE',
            capabilities: ['READ', 'QUERY'],
            sideEffects: ['NONE'],
            execute: async (input) => {
                const { getRecentQuotesTool } = await import('./read-only/getRecentQuotes.tool');
                return getRecentQuotesTool(input as any);
            },
        });

        // 8. get_customer_context
        this.registerTool({
            name: 'get_customer_context',
            description: 'Resolves customer background, organization, contacts, and recent orders/quotes.',
            inputSchema: z.object({
                tenantId: z.string().min(1, 'tenantId is required'),
                customerId: z.string().nullable().optional(),
                sessionCustomerId: z.string().nullable().optional(),
                phone: z.string().nullable().optional(),
                limit: z.number().int().positive().optional(),
            }),
            outputSchema: z.any().nullable(),
            isReadOnly: true,
            riskClass: 'SAFE',
            capabilities: ['READ', 'QUERY', 'SEARCH'],
            sideEffects: ['NONE'],
            execute: async (input) => {
                const { getCustomerContextTool } = await import('./read-only/getCustomerContext.tool');
                return getCustomerContextTool(input as any);
            },
        });
    }

    /**
     * Registers a Frank tool contract into the central registry.
     * Validates contract invariants before registering.
     */
    registerTool<TInput, TOutput>(contract: FrankToolContract<TInput, TOutput>): void {
        validateToolContractInvariants(contract);

        this.tools.set(contract.name, contract);
        logger.info('frank_tool_registered', {
            toolName: contract.name,
            isReadOnly: contract.isReadOnly,
            riskClass: contract.riskClass,
            capabilities: contract.capabilities,
            sideEffects: contract.sideEffects,
        });
    }

    /**
     * Resolves a registered tool contract by name.
     */
    getTool<TInput = unknown, TOutput = unknown>(name: string): FrankToolContract<TInput, TOutput> | undefined {
        return this.tools.get(name) as FrankToolContract<TInput, TOutput> | undefined;
    }

    /**
     * Resolves a registered tool contract or throws if missing.
     */
    getToolOrThrow<TInput = unknown, TOutput = unknown>(name: string): FrankToolContract<TInput, TOutput> {
        const tool = this.getTool<TInput, TOutput>(name);
        if (!tool) {
            throw new FrankToolNotFoundError(name);
        }
        return tool;
    }

    /**
     * Checks if a tool is registered.
     */
    hasTool(name: string): boolean {
        return this.tools.has(name);
    }

    /**
     * Returns all registered tool contracts.
     */
    listTools(): FrankToolContract<any, any>[] {
        return Array.from(this.tools.values());
    }

    /**
     * Clears all registered tools (used for test isolation).
     */
    clear(): void {
        this.tools.clear();
    }
}

export const frankToolRegistry = new FrankToolRegistry();
