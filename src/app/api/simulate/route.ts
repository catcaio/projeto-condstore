import { NextRequest, NextResponse } from 'next/server';
import { freightService } from '../../../modules/freight/freight.service';
import { simulationRepository } from '../../../infra/repositories/simulation.repository';
import { getTenantContext } from '../../../infra/auth/tenant-context';
import { BusinessError, getUserMessage } from '../../../infra/errors';
import { logger } from '../../../infra/logger';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const simulateSchema = z.object({
  destinationCep: z.string().regex(/^\d{8}$/, 'CEP deve ter 8 dígitos'),
  quantity: z.number().int().positive('Quantidade deve ser positiva'),
  unitWeight: z.number().positive('Peso unitário deve ser positivo').optional(),
  dimensions: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    length: z.number().positive(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Get tenant from session (via middleware headers)
    const { tenantId } = await getTenantContext(request);

    // 2. Validate input
    const body = await request.json();
    const validation = simulateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          details: validation.error.format()
        },
        { status: 400 }
      );
    }

    const { destinationCep, quantity, unitWeight, dimensions } = validation.data;

    logger.info('Freight simulation request', { destinationCep, quantity, tenantId });

    // 3. Calculate freight (FreightService is calc-focused, no persistence here)
    const result = await freightService.calculateFreight({
      destinationCep,
      quantity,
      unitWeight,
      dimensions,
    });

    // 4. Persist simulation with tenant context in route handler
    if (result.success && result.options.length > 0) {
      const bestOption = result.options[0];
      try {
        await simulationRepository.saveSimulation({
          id: randomUUID(),
          tenantId,
          cep: destinationCep,
          weight: result.totalWeight.toString(),
          quantity,
          bestCarrier: bestOption.carrier,
          bestService: bestOption.service,
          bestPrice: bestOption.price.toString(),
          bestMargin: (bestOption.price * 0.2).toString(),
          strategy: 'PORTAL',
          productCost: '0.00',
          sellingPrice: '0.00',
        });
      } catch (err) {
        logger.error('Failed to persist portal simulation', err as Error, { tenantId });
        // Don't fail the response if persistence fails - the user still gets their quote
      }
    }

    const duration = Date.now() - startTime;
    logger.info('Freight simulation completed', { duration, success: true, tenantId });

    return NextResponse.json(result);

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Freight simulation failed', error as Error, { duration });

    if (error instanceof BusinessError) {
      return NextResponse.json(
        {
          success: false,
          error: getUserMessage(error),
          code: error.code
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno ao calcular frete'
      },
      { status: 500 }
    );
  }
}
