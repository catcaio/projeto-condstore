import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { logger } from '../logger';
import { tenantAiProviders, type TenantAIProviderRecord } from '../../drizzle/schema';
import { encryptApiKey, decryptApiKey } from '../crypto/api-key.crypto';

export interface UpsertTenantAIProviderInput {
  providerType: 'shared' | 'dedicated' | 'customer_hosted' | 'cloud';
  baseUrl: string;
  model: string;
  embedModel: string;
  apiKey?: string | null;
  timeoutMs?: number;
  isEnabled?: boolean;
}

export type TenantAIProviderWithKey = TenantAIProviderRecord & {
  /** apiKey decriptada em memória — nunca persistida como campo separado */
  resolvedApiKey: string | null;
};

const DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.DEFAULT_AI_TIMEOUT_MS || '20000', 10);

/** Resolve a API key em memória a partir do valor criptografado (v1:...). */
function resolveApiKey(row: TenantAIProviderRecord): string | null {
  const raw = row.apiKeyEncrypted ?? null;
  if (!raw) return null;
  return decryptApiKey(raw);
}

export class TenantAIProviderRepository {
  async getProviderConfig(tenantId: string): Promise<TenantAIProviderWithKey | null> {
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

      const row = results[0];

      logger.info('Tenant AI provider config retrieved', {
        tenantId,
        providerType: row.providerType,
        hasKey: !!row.apiKeyEncrypted,
      });

      return { ...row, resolvedApiKey: resolveApiKey(row) };
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
    const isEnabled = payload.isEnabled ?? true;

    // Criptografia: nunca persiste plaintext
    const apiKeyEncrypted = payload.apiKey ? (encryptApiKey(payload.apiKey) ?? null) : null;

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
          apiKeyEncrypted,
          isEnabled: isEnabled ? 1 : 0,
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
      apiKeyEncrypted,
      isEnabled: isEnabled ? 1 : 0,
      timeoutMs,
    });

    logger.info('Tenant AI provider config created', {
      tenantId,
      providerType: payload.providerType,
    });
  }

  async rotateApiKey(tenantId: string, apiKey: string): Promise<void> {
    if (!tenantId) {
      throw new Error('tenantId is required');
    }

    if (!apiKey) {
      throw new Error('apiKey is required');
    }

    const apiKeyEncrypted = encryptApiKey(apiKey);
    if (!apiKeyEncrypted) {
      throw new Error('Não é possível rotacionar apiKey sem PROVIDER_SECRETS_KEY configurada');
    }

    const db = await getDb();
    await db
      .update(tenantAiProviders)
      .set({
        apiKeyEncrypted,
        isEnabled: 1,
      })
      .where(eq(tenantAiProviders.tenantId, tenantId));

    logger.info('Tenant AI provider api key rotated', { tenantId });
  }

  async disableProvider(tenantId: string): Promise<void> {
    if (!tenantId) {
      throw new Error('tenantId is required');
    }

    const db = await getDb();
    await db
      .update(tenantAiProviders)
      .set({ isEnabled: 0 })
      .where(eq(tenantAiProviders.tenantId, tenantId));

    logger.info('Tenant AI provider disabled', { tenantId });
  }
}

export const tenantAiProviderRepository = new TenantAIProviderRepository();
