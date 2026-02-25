import { createHash, randomUUID } from 'crypto';
import { getDb } from '../db';
import { freightSimulationLogs } from '../../drizzle/schema';
import { logger } from '../logger';
import { redisClient } from '../redis.client';
import type { AttributionSnapshot } from '../attribution/attribution.types';
import { structuredLogger } from '../log/logger';

interface SaveFreightSimulationMetricInput {
  tenantId: string;
  destinationCep: string;
  totalWeight: number;
  bestPrice: number;
  bestDeliveryTime: number;
  uf?: string;
  attribution?: AttributionSnapshot | null;
  requestId?: string;
}

export class FreightSimulationLogRepository {
  async saveMetric(input: SaveFreightSimulationMetricInput): Promise<void> {
    const startedAt = Date.now();
    const db = await getDb();

    const uf = (input.uf || 'NA').toUpperCase().slice(0, 2);
    try {
      await db.insert(freightSimulationLogs).values({
        id: randomUUID(),
        tenantId: input.tenantId,
        uf,
        peso: input.totalWeight.toFixed(2),
        valor: input.bestPrice.toFixed(2),
        prazo: input.bestDeliveryTime,
        cepHash: this.hashCep(input.destinationCep),
        utmSource: input.attribution?.utmSource ?? null,
        utmMedium: input.attribution?.utmMedium ?? null,
        utmCampaign: input.attribution?.utmCampaign ?? null,
        utmTerm: input.attribution?.utmTerm ?? null,
        utmContent: input.attribution?.utmContent ?? null,
        refToken: input.attribution?.refToken ?? null,
        clickId: input.attribution?.clickId ?? null,
      });

      if (redisClient.isAvailable()) {
        await redisClient.del(`cockpit:metrics:freight:${input.tenantId}`);
      }

      structuredLogger.info('freight_simulation_log_insert', {
        requestId: input.requestId,
        tenantId: input.tenantId,
        eventType: 'freight_simulation_log_insert',
        durationMs: Date.now() - startedAt,
        outcome: 'ok',
      });
    } catch (error) {
      structuredLogger.error('freight_simulation_log_insert_failed', {
        requestId: input.requestId,
        tenantId: input.tenantId,
        eventType: 'freight_simulation_log_insert',
        durationMs: Date.now() - startedAt,
        outcome: 'error',
        errorCode: 'DB_ERROR',
        error,
      });
      throw error;
    }
  }

  private hashCep(cep: string): string {
    return createHash('sha256').update(cep).digest('hex');
  }

  saveMetricInBackground(input: SaveFreightSimulationMetricInput): void {
    void this.saveMetric(input).catch((error) => {
      logger.error('Failed to persist freight simulation metric', error as Error, {
        tenantId: input.tenantId,
      });
    });
  }
}

export const freightSimulationLogRepository = new FreightSimulationLogRepository();
