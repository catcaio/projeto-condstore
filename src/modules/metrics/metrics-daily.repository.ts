import { sql } from 'drizzle-orm';
import { getDb } from '../../infra/db';
import { unwrapRows } from './attribution-breakdown';

export type MetricsDailyGroupBy = 'utm_source' | 'utm_campaign';

export interface MetricsDailyAcquisitionBucketRow {
  bucket: string | null;
  total_click_tokens: number | string | null;
  total_consumed_tokens: number | string | null;
  total_events: number | string | null;
  funnel_started: number | string | null;
  freight_simulations: number | string | null;
}

export interface MetricsDailyUpsertRow {
  tenantId: string;
  dayDate: string;
  utmSource: string;
  utmCampaign: string;
  totalEvents: number;
  funnelStarted: number;
  freightSimulations: number;
  consumedTokens: number;
  clickTokens: number;
}

function normalizeBucketValue(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? '';
  return trimmed || '(none)';
}

function toInt(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function isTableMissingMetricsDaily(error: unknown): boolean {
  const e = error as { code?: string; message?: string };
  return e?.code === 'ER_NO_SUCH_TABLE' || Boolean(e?.message?.toLowerCase().includes('metrics_daily'));
}

export class MetricsDailyRepository {
  async queryAcquisitionBuckets(params: {
    tenantId: string;
    groupBy: MetricsDailyGroupBy;
    startDay: string;
    endDayExclusive: string;
  }): Promise<MetricsDailyAcquisitionBucketRow[]> {
    const db = await getDb();
    const byCampaign = params.groupBy === 'utm_campaign';

    const result = byCampaign
      ? await db.execute(sql`
          SELECT
            COALESCE(NULLIF(utm_campaign, ''), '(none)') AS bucket,
            SUM(click_tokens) AS total_click_tokens,
            SUM(consumed_tokens) AS total_consumed_tokens,
            SUM(total_events) AS total_events,
            SUM(funnel_started) AS funnel_started,
            SUM(freight_simulations) AS freight_simulations
          FROM metrics_daily
          WHERE tenant_id = ${params.tenantId}
            AND day_date >= ${params.startDay}
            AND day_date < ${params.endDayExclusive}
          GROUP BY COALESCE(NULLIF(utm_campaign, ''), '(none)')
          ORDER BY total_click_tokens DESC, bucket ASC
        `)
      : await db.execute(sql`
          SELECT
            COALESCE(NULLIF(utm_source, ''), '(none)') AS bucket,
            SUM(click_tokens) AS total_click_tokens,
            SUM(consumed_tokens) AS total_consumed_tokens,
            SUM(total_events) AS total_events,
            SUM(funnel_started) AS funnel_started,
            SUM(freight_simulations) AS freight_simulations
          FROM metrics_daily
          WHERE tenant_id = ${params.tenantId}
            AND day_date >= ${params.startDay}
            AND day_date < ${params.endDayExclusive}
          GROUP BY COALESCE(NULLIF(utm_source, ''), '(none)')
          ORDER BY total_click_tokens DESC, bucket ASC
        `);

    return unwrapRows<MetricsDailyAcquisitionBucketRow>(result);
  }

  async upsertDailyRows(rows: MetricsDailyUpsertRow[]): Promise<void> {
    if (rows.length === 0) return;
    const db = await getDb();

    for (const row of rows) {
      await db.execute(sql`
        INSERT INTO metrics_daily (
          tenant_id,
          day_date,
          utm_source,
          utm_campaign,
          total_events,
          funnel_started,
          freight_simulations,
          consumed_tokens,
          click_tokens
        ) VALUES (
          ${row.tenantId},
          ${row.dayDate},
          ${normalizeBucketValue(row.utmSource)},
          ${normalizeBucketValue(row.utmCampaign)},
          ${toInt(row.totalEvents)},
          ${toInt(row.funnelStarted)},
          ${toInt(row.freightSimulations)},
          ${toInt(row.consumedTokens)},
          ${toInt(row.clickTokens)}
        )
        ON DUPLICATE KEY UPDATE
          total_events = VALUES(total_events),
          funnel_started = VALUES(funnel_started),
          freight_simulations = VALUES(freight_simulations),
          consumed_tokens = VALUES(consumed_tokens),
          click_tokens = VALUES(click_tokens)
      `);
    }
  }

  isUnavailableError(error: unknown): boolean {
    return isTableMissingMetricsDaily(error);
  }
}

export const metricsDailyRepository = new MetricsDailyRepository();
