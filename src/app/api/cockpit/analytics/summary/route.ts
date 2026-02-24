import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import { requireActivePlan } from '../../../../../modules/billing/requireActivePlan';
import { logger } from '@/infra/logger';

export const runtime = 'nodejs';


function isAnalyticsTableMissing(error: unknown): boolean {
  const errorObj = error as { message?: string; code?: string; cause?: { message?: string; code?: string } };
  const errorMessage = `${errorObj?.message ?? ''} ${errorObj?.cause?.message ?? ''}`.toLowerCase();
  const errorCode = `${errorObj?.code ?? ''} ${errorObj?.cause?.code ?? ''}`.toUpperCase();

  return (
    errorCode.includes('ER_NO_SUCH_TABLE') ||
    errorMessage.includes("doesn't exist") ||
    errorMessage.includes('unknown table') ||
    errorMessage.includes('table public_events')
  );
}

interface EventCountRow {
  event: string;
  count: number | string;
}

interface ScalarRow {
  totalEvents?: number | string;
  uniqueAnon?: number | string;
}

interface FunnelRow {
  event: string;
  count: number | string;
}

function unwrapRows<T>(result: unknown): T[] {
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0] as T[];
  }

  if (Array.isArray(result)) {
    return result as T[];
  }

  return [];
}

function toRate(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }

  return Number(((numerator / denominator) * 100).toFixed(1));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const entitlement = await requireActivePlan(request);
  if (entitlement.errorResponse) {
    return entitlement.errorResponse;
  }

  try {
    const db = await getDb();

    const [summaryResult, countsResult, funnelResult] = await Promise.all([
      db.execute(sql`
        SELECT
          COUNT(*) AS totalEvents,
          COUNT(DISTINCT anon_id) AS uniqueAnon
        FROM public_events
        WHERE created_at >= NOW() - INTERVAL 7 DAY
      `),
      db.execute(sql`
        SELECT
          event,
          COUNT(*) AS count
        FROM public_events
        WHERE created_at >= NOW() - INTERVAL 7 DAY
        GROUP BY event
        ORDER BY count DESC, event ASC
      `),
      db.execute(sql`
        SELECT
          event,
          COUNT(*) AS count
        FROM public_events
        WHERE created_at >= NOW() - INTERVAL 7 DAY
          AND event IN ('landing_view', 'pricing_view', 'pricing_click_checkout')
        GROUP BY event
      `),
    ]);

    const summaryRows = unwrapRows<ScalarRow>(summaryResult);
    const countRows = unwrapRows<EventCountRow>(countsResult);
    const funnelRows = unwrapRows<FunnelRow>(funnelResult);

    const totalEvents = Number(summaryRows[0]?.totalEvents ?? 0);
    const uniqueAnon = Number(summaryRows[0]?.uniqueAnon ?? 0);

    const counts = countRows.map((row) => ({
      event: row.event,
      count: Number(row.count ?? 0),
    }));

    const funnelCountMap = new Map<string, number>(
      funnelRows.map((row) => [row.event, Number(row.count ?? 0)]),
    );

    const landingView = funnelCountMap.get('landing_view') ?? 0;
    const pricingView = funnelCountMap.get('pricing_view') ?? 0;
    const pricingClickCheckout = funnelCountMap.get('pricing_click_checkout') ?? 0;

    return NextResponse.json({
      totalEvents,
      uniqueAnon,
      counts,
      funnel: {
        landing_view: landingView,
        pricing_view: pricingView,
        pricing_click_checkout: pricingClickCheckout,
        rates: {
          pricing_view_over_landing_view: toRate(pricingView, landingView),
          click_checkout_over_pricing_view: toRate(pricingClickCheckout, pricingView),
        },
      },
    });
  } catch (error) {
    logger.error('cockpit/analytics/summary: failed to load summary', error as Error);

    if (isAnalyticsTableMissing(error)) {
      return NextResponse.json({ error: 'Analytics table not migrated' }, { status: 503 });
    }

    return NextResponse.json({ error: 'Failed to load analytics summary' }, { status: 500 });
  }
}
