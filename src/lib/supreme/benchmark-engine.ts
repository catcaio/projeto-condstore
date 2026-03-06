/**
 * benchmark-engine.ts
 *
 * Safely computes benchmarks across tenant segments without leaking PII.
 */

import { getDb } from '@/infra/db';
import { tenants, supremeBenchmarks } from '@/drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getBenchmarkSegmentKey } from './benchmark-segmentation';
import { getTenantCoreMetrics } from '@/lib/metrics/cockpit-metrics-engine';
import crypto from 'crypto';

export interface TenantBenchmarkData {
    segmentKey: string;
    metrics: Array<{
        metric: string;
        tenantValue: number | null;
        p25: number | null;
        p50: number | null;
        p75: number | null;
        sampleSize: number;
        positionLabel: 'below_baseline' | 'median_band' | 'top_quartile' | 'unknown';
    }>;
}

/**
 * Runs globally (designed for a cron).
 * Queries all active tenants, computes their operational metrics, groups by computed segment, and calculates anon percentiles.
 * 
 * Rules:
 * - Minimum 3 tenants per segment to emit a benchmark (privacy).
 */
export async function computeBenchmarks(periodDays: number = 30): Promise<number> {
    const db = await getDb();
    const allTenants = await db.select({ id: tenants.id }).from(tenants);

    // 1) Group metric arrays by segment
    const segments: Record<string, Record<string, number[]>> = {};

    const to = new Date();
    const from = new Date(to.getTime() - periodDays * 24 * 60 * 60 * 1000);

    for (const t of allTenants) {
        try {
            const segKey = await getBenchmarkSegmentKey(t.id);
            if (!segments[segKey]) segments[segKey] = {};

            const metrics = await getTenantCoreMetrics(t.id, { from, to });

            const flatMetrics: Record<string, number> = {
                'quote_to_order_rate': metrics.conversion.quote_to_order_rate,
                'checkout_completion_rate': metrics.conversion.checkout_completion_rate,
                'repeat_orders_total': metrics.retention.repeat_orders_total,
                'payments_confirmed_total': metrics.revenue.payments_confirmed_total,
                'avg_response_time_ms': (metrics.operations as any).avg_response_time_ms ?? 0
            };

            for (const [key, val] of Object.entries(flatMetrics)) {
                if (!segments[segKey][key]) segments[segKey][key] = [];
                if (typeof val === 'number') {
                    segments[segKey][key].push(val);
                }
            }
        } catch (err) {
            // Ignore tenant computation failures and continue
        }
    }

    // 2) Compute percentiles and save
    let savedCount = 0;

    for (const [segKey, metricGroups] of Object.entries(segments)) {
        for (const [metricKey, values] of Object.entries(metricGroups)) {
            if (values.length < 3) continue; // PRIVACY: DO NOT EMIT

            values.sort((a, b) => a - b);

            const p25 = calcPercentile(values, 25);
            const p50 = calcPercentile(values, 50);
            const p75 = calcPercentile(values, 75);

            await db.insert(supremeBenchmarks).values({
                id: crypto.randomUUID(),
                benchmarkDomain: mapDomain(metricKey),
                benchmarkMetric: metricKey,
                segmentKey: segKey,
                sampleSize: values.length,
                p25,
                p50,
                p75,
            });
            savedCount++;
        }
    }

    return savedCount;
}

/**
 * Returns safe benchmark comparisons for a specific tenant against its most recently computed segment percentiles.
 */
export async function getTenantBenchmarks(tenantId: string, periodDays: number = 30): Promise<TenantBenchmarkData> {
    const segKey = await getBenchmarkSegmentKey(tenantId);
    const db = await getDb();

    // Get the most recent benchmarks for this segment (one per metric)
    // For simplicity since doing dense partitioned subqueries in Drizzle can be tricky, 
    // we query them raw sorting by compute date and grabbing distinct metrics.

    const rawRows = await db.select()
        .from(supremeBenchmarks)
        .where(eq(supremeBenchmarks.segmentKey, segKey))
        .orderBy(desc(supremeBenchmarks.computedAt))
        .limit(100);

    // Take the most recent entry per metric
    const latestByMetric = new Map<string, typeof rawRows[0]>();
    for (const r of rawRows) {
        if (!latestByMetric.has(r.benchmarkMetric)) latestByMetric.set(r.benchmarkMetric, r);
    }

    // Get tenant's own live metrics
    const to = new Date();
    const from = new Date(to.getTime() - periodDays * 24 * 60 * 60 * 1000);

    let tMetrics: Record<string, number> = {};
    try {
        const cm = await getTenantCoreMetrics(tenantId, { from, to });
        tMetrics = {
            'quote_to_order_rate': cm.conversion.quote_to_order_rate,
            'checkout_completion_rate': cm.conversion.checkout_completion_rate,
            'repeat_orders_total': cm.retention.repeat_orders_total,
            'payments_confirmed_total': cm.revenue.payments_confirmed_total,
            'avg_response_time_ms': (cm.operations as any).avg_response_time_ms ?? 0
        };
    } catch (err) {
        tMetrics = {}; // Provide safe empty response if live metrics fail
    }

    const resultMetrics: TenantBenchmarkData['metrics'] = [];

    for (const [mKey, bMark] of latestByMetric.entries()) {
        const tVal = tMetrics[mKey] ?? null;
        let pos: 'below_baseline' | 'median_band' | 'top_quartile' | 'unknown' = 'unknown';

        if (tVal !== null && bMark.p25 !== null && bMark.p75 !== null) {
            // Special inversion for metrics where lower is better (like response time)
            const lowerIsBetter = mKey === 'avg_response_time_ms';

            if (lowerIsBetter) {
                if (tVal > bMark.p75) pos = 'below_baseline'; // Above 75th percentile is bad
                else if (tVal <= bMark.p25) pos = 'top_quartile';
                else pos = 'median_band';
            } else {
                if (tVal < bMark.p25) pos = 'below_baseline';
                else if (tVal >= bMark.p75) pos = 'top_quartile';
                else pos = 'median_band';
            }
        }

        resultMetrics.push({
            metric: mKey,
            tenantValue: tVal,
            p25: bMark.p25,
            p50: bMark.p50,
            p75: bMark.p75,
            sampleSize: bMark.sampleSize,
            positionLabel: pos
        });
    }

    return {
        segmentKey: segKey,
        metrics: resultMetrics
    };
}

// ── Helpers ──

function calcPercentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = lower + 1;
    const weight = index % 1;
    if (upper >= sorted.length) return sorted[lower];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function mapDomain(metric: string): string {
    if (metric.includes('quote') || metric.includes('checkout')) return 'CONVERSION';
    if (metric.includes('repeat')) return 'RETENTION';
    if (metric.includes('payment') || metric.includes('revenue')) return 'REVENUE';
    return 'OPERATIONS';
}
