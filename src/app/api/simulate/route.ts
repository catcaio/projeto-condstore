import { NextRequest, NextResponse } from 'next/server';
import { freightService } from '../../../modules/freight/freight.service';
import { BusinessError, ErrorCode, getUserMessage } from '../../../infra/errors';
import { logger } from '../../../infra/logger';
import { z } from 'zod';

// Schema for input validation
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
    const body = await request.json();
    
    // Validate input
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

    logger.info('Freight simulation request', { destinationCep, quantity });

    // Calculate freight
    const result = await freightService.calculateFreight({
      destinationCep,
      quantity,
      unitWeight,
      dimensions,
    });

    const duration = Date.now() - startTime;
    logger.info('Freight simulation completed', { duration, success: true });

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
        { status: 400 } // Business errors are usually 400 (bad request/state)
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
