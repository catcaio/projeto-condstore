/**
 * benchmark-segmentation.ts
 *
 * Defines the segmentation strategy for tenants so they are compared against
 * peers of similar characteristics (e.g. volume, vertical).
 */

import { getDb } from '@/infra/db';
import { tenants } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { getTenantCoreMetrics } from '@/lib/metrics/cockpit-metrics-engine';

/**
 * Computes a standard segment key for a tenant based on their metadata and current volume.
 * Fallback to 'default_segment' if we don't have enough metadata.
 * 
 * Future expansions: industry vertical, region, monthly volume bins (e.g., 'vol_0_1k', 'vol_1k_10k')
 */
export async function getBenchmarkSegmentKey(tenantId: string): Promise<string> {
    const db = await getDb();
    // Fetch tenant metadata
    const rows = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (rows.length === 0) return 'default_segment';

    const tenant = rows[0] as any;
    const industry = (tenant.metadata && tenant.metadata.industry) ? tenant.metadata.industry : 'general';

    // To avoid computing volume bins on the fly across huge ranges, we can either
    // use a simplified global segment, or just segment by industry for the MVP.
    // We use industry for now.
    return `segment_${industry.toLowerCase()}`;
}
