import { NextRequest, NextResponse } from 'next/server';
import { freightService } from '../../../modules/freight/freight.service';
import { simulationRepository } from '../../../infra/repositories/simulation.repository';
import { getSessionUser } from '@/infra/auth/session';
import { BusinessError, ErrorCode, getUserMessage } from '../../../infra/errors';
import { logger } from '@/infra/logger';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { requireActivePlan } from '../../../modules/billing/requireActivePlan';
import { auditService } from '../../../modules/audit/audit.service';
import { checkRateLimit } from '../../../infra/rate-limiter';
import { planEnforcementService } from '../../../modules/finops/plan-enforcement.service';

export const runtime = 'nodejs';

const simulateSchema = z.object({
  destinationCep: z.string().regex(/^\d{8}$/, 'CEP deve ter 8 dígitos'),
  quantity: z.number().int().positive('Quantidade deve ser positiva'),
  unitWeight: z.number().positive('Peso unitário deve ser positivo').optional(),
  dimensions: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    length: z.number().positive(),
  }).optional(),
  productRef: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let tenantId: string | undefined;

  try {
    // 1) Auth / tenant resolution + Plan Entitlement
    const entitlement = await requireActivePlan(request);
    if (entitlement.errorResponse) {
      return entitlement.errorResponse;
    }
    tenantId = entitlement.tenantId!;

    // 1.5) Tenant-level rate limit (e.g. 30 per minute) to prevent API scraping abuse
    const rateLimit = await checkRateLimit(`simulate:t:${tenantId}`, 30, 60);
    if (!rateLimit.allowed) {
      logger.warn('Simulate rate limit exceeded', { tenantId });
      return NextResponse.json(
        { success: false, error: 'Muitas consultas. Tente novamente em alguns minutos.' },
        { status: 429 }
      );
    }

    // 1.6) Plan Limit Enforcement
    const enforcement = await planEnforcementService.enforcePlanLimit(tenantId, 'freight_simulation');
    if (!enforcement.allowed) {
      logger.warn('Plan limit exceeded for freight_simulation', { tenantId });
      return NextResponse.json(
        {
          success: false,
          error: 'Limite do plano excedido',
          code: 'PAYMENT_REQUIRED',
          details: { state: enforcement.state, percentUsed: enforcement.percentUsed }
        },
        { status: 402, headers: enforcement.headers }
      );
    }

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

    const { destinationCep, quantity, unitWeight, dimensions, productRef } = validation.data;

    logger.info('Freight simulation request', { destinationCep, quantity, tenantId });

    // 3. Calculate freight (FreightService is calc-focused, no persistence here)
    const result = await freightService.calculateFreight({
      destinationCep,
      quantity,
      tenantId,
      unitWeight,
      dimensions,
      productRef,
    });

    // 4. Persist simulation with tenant context in route handler
    if (result.success && result.options.length > 0) {
      const bestOption = result.options[0];

      const simulationRecord = {
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
      };

      try {
        await simulationRepository.saveSimulation(simulationRecord);

        await auditService.logEvent(tenantId, 'SIMULATION_CREATED', {
          simulationId: simulationRecord.id,
          cep: destinationCep,
          weight: result.totalWeight,
          bestPrice: bestOption.price
        });

        await planEnforcementService.invalidateCache(tenantId);

      } catch (err) {
        logger.error('Failed to persist portal simulation', err as Error, { tenantId });
        // Don't fail the response if persistence fails - the user still gets their quote
      }
    }

    const duration = Date.now() - startTime;
    logger.info('Freight simulation completed', { duration, success: true, tenantId });

    return NextResponse.json(result);

  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('Freight API Simulation Error', error as Error, { tenantId, durationMs });

    // Try to safely extract a tenantId if possible for the audit trail
    // Since we throw before tenantId is set if entitlement fails, we only audit if we have it
    if (typeof tenantId === 'string') {
      await auditService.logEvent(tenantId, 'SIMULATION_FAILED', {
        errorMessage: String(error),
        errorCode: error instanceof BusinessError ? error.code : 'UNKNOWN_ERROR'
      });
    }

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
