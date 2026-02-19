import { createHash, randomUUID } from 'crypto';
import { getDb } from '../db';
import { freightSimulationLogs } from '../../drizzle/schema';
import { logger } from '../logger';

interface SaveFreightSimulationMetricInput {
  tenantId: string;
  destinationCep: string;
  totalWeight: number;
  bestPrice: number;
  bestDeliveryTime: number;
  uf?: string;
}

export class FreightSimulationLogRepository {
  async saveMetric(input: SaveFreightSimulationMetricInput): Promise<void> {
    const db = await getDb();

    const uf = (input.uf || 'NA').toUpperCase().slice(0, 2);

    await db.insert(freightSimulationLogs).values({
      id: randomUUID(),
      tenantId: input.tenantId,
      uf,
      peso: input.totalWeight.toFixed(2),
      valor: input.bestPrice.toFixed(2),
      prazo: input.bestDeliveryTime,
      cepHash: this.hashCep(input.destinationCep),
    });
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
