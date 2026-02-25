import { randomUUID } from 'crypto';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { attributionClicks, type AttributionClickRecord, type NewAttributionClickRecord } from '../../drizzle/schema';
import { getDb } from '../db';
import type { AttributionClickFields, AttributionSnapshot } from '../attribution/attribution.types';
import { normalizeAttributionSnapshot } from '../attribution/attribution.types';
import { structuredLogger } from '../log/logger';

function toAttributionSnapshot(row: AttributionClickRecord): AttributionSnapshot | null {
  return normalizeAttributionSnapshot({
    utmSource: row.utmSource,
    utmMedium: row.utmMedium,
    utmCampaign: row.utmCampaign,
    utmTerm: row.utmTerm,
    utmContent: row.utmContent,
    refToken: row.token,
    clickId: row.clickId,
  });
}

export class AttributionClickRepository {
  async getByToken(token: string): Promise<AttributionClickRecord | null> {
    if (!token) return null;
    const db = await getDb();
    const rows = await db
      .select()
      .from(attributionClicks)
      .where(eq(attributionClicks.token, token))
      .limit(1);
    return rows[0] ?? null;
  }

  async upsertByToken(input: AttributionClickFields): Promise<void> {
    if (!input.token?.trim()) {
      throw new Error('token is required');
    }

    const token = input.token.trim();
    const existing = await this.getByToken(token);
    const db = await getDb();

    if (!existing) {
      await db.insert(attributionClicks).values({
        id: randomUUID(),
        token,
        tenantId: input.tenantId ?? null,
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? null,
        utmTerm: input.utmTerm ?? null,
        utmContent: input.utmContent ?? null,
        clickId: input.clickId ?? null,
        landingUrl: input.landingUrl ?? null,
        userAgentHash: input.userAgentHash ?? null,
        ipHash: input.ipHash ?? null,
      });
      return;
    }

    await db
      .update(attributionClicks)
      .set({
        tenantId: input.tenantId ?? existing.tenantId ?? null,
        utmSource: input.utmSource ?? existing.utmSource ?? null,
        utmMedium: input.utmMedium ?? existing.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? existing.utmCampaign ?? null,
        utmTerm: input.utmTerm ?? existing.utmTerm ?? null,
        utmContent: input.utmContent ?? existing.utmContent ?? null,
        clickId: input.clickId ?? existing.clickId ?? null,
        landingUrl: input.landingUrl ?? existing.landingUrl ?? null,
        userAgentHash: input.userAgentHash ?? existing.userAgentHash ?? null,
        ipHash: input.ipHash ?? existing.ipHash ?? null,
      })
      .where(eq(attributionClicks.id, existing.id));
  }

  async insertMany(rows: NewAttributionClickRecord[]): Promise<void> {
    if (rows.length === 0) return;
    const db = await getDb();
    await db.insert(attributionClicks).values(rows);
  }

  async listByTenant(params: {
    tenantId: string;
    campaign?: string | null;
    page: number;
    limit: number;
  }): Promise<{ items: AttributionClickRecord[]; total: number }> {
    const db = await getDb();
    const filters = [eq(attributionClicks.tenantId, params.tenantId)];
    if (params.campaign?.trim()) {
      filters.push(eq(attributionClicks.utmCampaign, params.campaign.trim()));
    }

    const whereClause = filters.length > 1 ? and(...filters) : filters[0];

    const items = await db
      .select()
      .from(attributionClicks)
      .where(whereClause)
      .orderBy(desc(attributionClicks.createdAt))
      .limit(params.limit)
      .offset((params.page - 1) * params.limit);

    const totalRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(attributionClicks)
      .where(whereClause);

    return {
      items,
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  async consumeByToken(
    token: string,
    context?: { requestId?: string; tenantId?: string },
  ): Promise<{ row: AttributionClickRecord; attribution: AttributionSnapshot | null } | null> {
    const startedAt = Date.now();

    try {
      const row = await this.getByToken(token);
      if (!row) {
        structuredLogger.info('attribution_consume_token', {
          requestId: context?.requestId,
          tenantId: context?.tenantId,
          eventType: 'attribution_consume_token',
          durationMs: Date.now() - startedAt,
          outcome: 'error',
          errorCode: 'NOT_FOUND',
        });
        return null;
      }

      if (!row.consumedAt) {
        const db = await getDb();
        await db
          .update(attributionClicks)
          .set({ consumedAt: new Date() })
          .where(and(eq(attributionClicks.token, token), isNull(attributionClicks.consumedAt)));
      }

      const refreshed = (await this.getByToken(token)) ?? row;
      structuredLogger.info('attribution_consume_token', {
        requestId: context?.requestId,
        tenantId: context?.tenantId ?? refreshed.tenantId ?? undefined,
        eventType: 'attribution_consume_token',
        durationMs: Date.now() - startedAt,
        outcome: 'ok',
      });
      return { row: refreshed, attribution: toAttributionSnapshot(refreshed) };
    } catch (error) {
      structuredLogger.error('attribution_consume_token_failed', {
        requestId: context?.requestId,
        tenantId: context?.tenantId,
        eventType: 'attribution_consume_token',
        durationMs: Date.now() - startedAt,
        outcome: 'error',
        errorCode: 'DB_ERROR',
        error,
      });
      throw error;
    }
  }
}

export const attributionClickRepository = new AttributionClickRepository();
