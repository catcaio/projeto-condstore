import { z } from 'zod';
import { freightService } from '@/modules/freight/freight.service';
import { FrankToolContract } from './frank-tool.contract';
import { frankToolRegistry } from './frank-tool.registry';

export interface FreightCalculationParams {
    tenantId: string;
    productId: string;
    quantity: number;
    destinationZip: string;
}

export const freightCalculationInputSchema = z.object({
    tenantId: z.string().min(1, 'tenantId is required'),
    productId: z.string().min(1, 'productId is required'),
    quantity: z.number().int().positive('quantity must be positive'),
    destinationZip: z.string().min(1, 'destinationZip is required'),
});

export const freightCalculationOutputSchema = z.any();

export const freightCalculationContract: FrankToolContract<FreightCalculationParams, Awaited<ReturnType<typeof freightService.simulateFreight>>> = {
    name: 'freight_calculation',
    description: 'Calculates freight quote and delivery options for a given product and destination ZIP code.',
    inputSchema: freightCalculationInputSchema,
    outputSchema: freightCalculationOutputSchema,
    isReadOnly: true,
    riskClass: 'SAFE',
    capabilities: ['READ', 'QUERY'],
    sideEffects: ['NONE'],
    execute: async (input) => {
        return freightService.simulateFreight(input);
    },
};

frankToolRegistry.registerTool(freightCalculationContract);
