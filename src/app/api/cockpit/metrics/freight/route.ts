import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '../../../../../infra/db';
import { getSessionUser } from '../../../../../infra/auth/session';
import { logger } from '../../../../../infra/logger';
import { getRedis } from '../../../../../infra/redis.client';

interface FreightMetricsResponse {
  total_simulations_7d: number;
  top_ufs_7d: Array<{ uf: string; count: number }>;
  avg_valor_by_uf_7d: Array<{ uf: string; avg_valor: number }>;
  avg_peso_7d: number;
  avg_prazo_by_uf_7d: Array<{ uf: string; avg_prazo: number }>;
  daily_14d: Array<{ date: string; count: number }>;
}

interface FreightCacheEntry {
  expiresAt: number;
  payload: FreightMetricsResponse;
}

const CACHE_TTL_SECONDS = 60;
const CACHE_TTL_MS = CACHE_TTL_SECONDS * 1000;

const globalForFreightMetricsCache = globalThis as typeof globalThis & {
  cockpitFreightMetricsCache?: Map<string, FreightCacheEntry>;
};

const inMemoryCache =
  globalForFreightMetricsCache.cockpitFreightMetricsCache ??
  (globalForFreightMetricsCache.cockpitFreightMetricsCache = new Map<string, FreightCacheEntry>());

function unwrapRows<T>(result: unknown): T[] {
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0] as T[];
  }
  if (Array.isArray(result)) {
    return result as T[];
  }
  return [];
}

async function readFromCache(cacheKey: string, tenantId: string): Promise<FreightMetricsResponse | null> {
  try {
    if (getRedis().isAvailable()) {
      const cached = await getRedis().get<FreightMetricsResponse>(cacheKey);
      if (cached) {
        logger.info('cockpit/metrics/freight: cache_hit', { tenantId, cache: 'redis' });
        return cached;
      }
      logger.info('cockpit/metrics/freight: cache_miss', { tenantId, cache: 'redis' });
      return null;
    }
  } catch (error) {
    logger.warn('cockpit/metrics/freight: cache read failed', { tenantId, cache: 'redis' }, error as Error);
  }

  try {
    const cachedEntry = inMemoryCache.get(cacheKey);

    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
      logger.info('cockpit/metrics/freight: cache_hit', { tenantId, cache: 'memory' });
      return cachedEntry.payload;
    }

    if (cachedEntry) {
      inMemoryCache.delete(cacheKey);
    }

    logger.info('cockpit/metrics/freight: cache_miss', { tenantId, cache: 'memory' });
  } catch (error) {
    logger.warn('cockpit/metrics/freight: cache read failed', { tenantId, cache: 'memory' }, error as Error);
  }

  return null;
}

function writeToCache(cacheKey: string, tenantId: string, payload: FreightMetricsResponse): void {
  if (getRedis().isAvailable()) {
    getRedis().set<FreightMetricsResponse>(cacheKey, payload, CACHE_TTL_SECONDS).catch((error: unknown) => {
      logger.warn('cockpit/metrics/freight: cache write failed', { tenantId, cache: 'redis' }, error as Error);
    });
    return;
  }

  try {
    inMemoryCache.set(cacheKey, {
      payload,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  } catch (error) {
    logger.warn('cockpit/metrics/freight: cache write failed', { tenantId, cache: 'memory' }, error as Error);
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now();
  let tenantId = 'unknown';

  try {
    const sessionUser = await getSessionUser(request);

    if (!sessionUser?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    tenantId = sessionUser.tenantId;
    const cacheKey = `cockpit:metrics:freight:${tenantId}`;

    const cachedPayload = await readFromCache(cacheKey, tenantId);
    if (cachedPayload) {
      return NextResponse.json(cachedPayload, {
        status: 200,
        headers: { 'Cache-Control': 'private, max-age=60' },
      });
    }

    const db = await getDb();

    const [totalResult, topUfsResult, avgValorByUfResult, avgPesoResult, avgPrazoByUfResult, dailyResult] =
      await Promise.all([
        db.execute(sql`
          SELECT COUNT(*) AS total
          FROM freight_simulation_logs
          WHERE tenant_id = ${tenantId}
            AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)
        `),
        db.execute(sql`
          SELECT uf, COUNT(*) AS count
          FROM freight_simulation_logs
          WHERE tenant_id = ${tenantId}
            AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)
          GROUP BY uf
          ORDER BY count DESC, uf ASC
        `),
        db.execute(sql`
          SELECT uf, AVG(valor) AS avg_valor
          FROM freight_simulation_logs
          WHERE tenant_id = ${tenantId}
            AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)
          GROUP BY uf
          ORDER BY uf ASC
        `),
        db.execute(sql`
          SELECT AVG(peso) AS avg_peso
          FROM freight_simulation_logs
          WHERE tenant_id = ${tenantId}
            AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)
        `),
        db.execute(sql`
          SELECT uf, AVG(prazo) AS avg_prazo
          FROM freight_simulation_logs
          WHERE tenant_id = ${tenantId}
            AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)
          GROUP BY uf
          ORDER BY uf ASC
        `),
        db.execute(sql`
          SELECT DATE(created_at) AS date, COUNT(*) AS count
          FROM freight_simulation_logs
          WHERE tenant_id = ${tenantId}
            AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 14 DAY)
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `),
      ]);

    const totalRows = unwrapRows<{ total: number | string }>(totalResult);
    const topUfsRows = unwrapRows<{ uf: string; count: number | string }>(topUfsResult);
    const avgValorRows = unwrapRows<{ uf: string; avg_valor: number | string | null }>(avgValorByUfResult);
    const avgPesoRows = unwrapRows<{ avg_peso: number | string | null }>(avgPesoResult);
    const avgPrazoRows = unwrapRows<{ uf: string; avg_prazo: number | string | null }>(avgPrazoByUfResult);
    const dailyRows = unwrapRows<{ date: string | Date; count: number | string }>(dailyResult);

    const payload: FreightMetricsResponse = {
      total_simulations_7d: Number(totalRows[0]?.total ?? 0),
      top_ufs_7d: topUfsRows.map((row) => ({ uf: row.uf, count: Number(row.count) })),
      avg_valor_by_uf_7d: avgValorRows.map((row) => ({ uf: row.uf, avg_valor: Number(row.avg_valor ?? 0) })),
      avg_peso_7d: Number(avgPesoRows[0]?.avg_peso ?? 0),
      avg_prazo_by_uf_7d: avgPrazoRows.map((row) => ({ uf: row.uf, avg_prazo: Number(row.avg_prazo ?? 0) })),
      daily_14d: dailyRows.map((row) => ({
        date: typeof row.date === 'string' ? row.date : row.date.toISOString().slice(0, 10),
        count: Number(row.count),
      })),
    };

    writeToCache(cacheKey, tenantId, payload);

    return NextResponse.json(payload, {
      status: 200,
      headers: { 'Cache-Control': 'private, max-age=60' },
    });
  } catch (error) {
    logger.error('cockpit/metrics/freight: unexpected error', error as Error, { tenantId });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    const durationMs = Date.now() - startedAt;
    const logContext = { tenantId, duration_ms: durationMs };

    if (durationMs > 500) {
      logger.warn('cockpit/metrics/freight: slow request', logContext);
    } else {
      logger.info('cockpit/metrics/freight: request completed', logContext);
    }
  }
}

