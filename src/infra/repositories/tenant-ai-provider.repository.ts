import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { logger } from '../logger';
import { tenantAiProviders, type TenantAIProviderRecord } from '../../drizzle/schema';

export interface UpsertTenantAIProviderInput {
  providerType: 'shared' | 'dedicated' | 'customer_hosted' | 'cloud';
  baseUrl: string;
  model: string;
  embedModel: string;
  apiKey?: string | null;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.DEFAULT_AI_TIMEOUT_MS || '20000', 10);

export class TenantAIProviderRepository {
  async getProviderConfig(tenantId: string): Promise<TenantAIProviderRecord | null> {
    if (!tenantId) {
      throw new Error('tenantId is required');
    }

    try {
      const db = await getDb();
      const results = await db
        .select()
        .from(tenantAiProviders)
        .where(eq(tenantAiProviders.tenantId, tenantId))
        .limit(1);

      if (results.length === 0) {
        logger.info('Tenant AI provider config not found', { tenantId });
        return null;
      }

      logger.info('Tenant AI provider config retrieved', {
        tenantId,
        providerType: results[0].providerType,
      });

      return results[0];
    } catch (error) {
      logger.error('Failed to get tenant AI provider config', error as Error, { tenantId });
      throw error;
    }
  }

  async upsertProviderConfig(tenantId: string, payload: UpsertTenantAIProviderInput): Promise<void> {
    if (!tenantId) {
      throw new Error('tenantId is required');
    }

    if (!payload?.providerType || !payload.baseUrl || !payload.model || !payload.embedModel) {
      throw new Error('providerType, baseUrl, model and embedModel are required');
    }

    const db = await getDb();
    const timeoutMs = payload.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const existing = await db
      .select({ id: tenantAiProviders.id })
      .from(tenantAiProviders)
      .where(eq(tenantAiProviders.tenantId, tenantId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(tenantAiProviders)
        .set({
          providerType: payload.providerType,
          baseUrl: payload.baseUrl,
          model: payload.model,
          embedModel: payload.embedModel,
          apiKey: payload.apiKey ?? null,
          timeoutMs,
        })
        .where(eq(tenantAiProviders.tenantId, tenantId));

      logger.info('Tenant AI provider config updated', {
        tenantId,
        providerType: payload.providerType,
      });

      return;
    }

    await db.insert(tenantAiProviders).values({
      id: randomUUID(),
      tenantId,
      providerType: payload.providerType,
      baseUrl: payload.baseUrl,
      model: payload.model,
      embedModel: payload.embedModel,
      apiKey: payload.apiKey ?? null,
      timeoutMs,
    });

    logger.info('Tenant AI provider config created', {
      tenantId,
      providerType: payload.providerType,
    });
  }
}

export const tenantAiProviderRepository = new TenantAIProviderRepository();
