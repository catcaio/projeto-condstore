import { z } from 'zod';
import { freightService } from '@/modules/freight/freight.service';
import { FrankToolContract } from './frank-tool.contract';
import { frankToolRegistry } from './frank-tool.registry';

export interface CreateQuoteParams {
    tenantId: string;
    productId: string;
    quantity: number;
    destinationZip: string;
}

export const createQuoteInputSchema = z.object({
    tenantId: z.string().min(1, 'tenantId is required'),
    productId: z.string().min(1, 'productId is required'),
    quantity: z.number().int().positive('quantity must be positive'),
    destinationZip: z.string().min(1, 'destinationZip is required'),
});

export const createQuoteOutputSchema = z.any();

export const createQuoteContract: FrankToolContract<CreateQuoteParams, Awaited<ReturnType<typeof freightService.simulateFreight>>> = {
    name: 'create_quote',
    description: 'Generates an official freight quote option for customer confirmation.',
    inputSchema: createQuoteInputSchema,
    outputSchema: createQuoteOutputSchema,
    isReadOnly: false,
    riskClass: 'GUARDED',
    capabilities: ['WRITE', 'CREATE', 'FINANCIAL'],
    sideEffects: ['PERSISTENCE_WRITE'],
    execute: async (input) => {
        return freightService.simulateFreight(input);
    },
};

frankToolRegistry.registerTool(createQuoteContract);
