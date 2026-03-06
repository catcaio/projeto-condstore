import { sql, eq, and, isNotNull, count } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import {
    tenants,
    users,
    messages,
    freightFunnelEvents,
    attributionClicks,
    simulations,
} from '@/drizzle/schema';
import { structuredLogger } from '@/infra/log/logger';

export interface TenantDataContractResult {
    tenantId: string;
    acquisition_ready: boolean;
    conversion_ready: boolean;
    revenue_ready: boolean;
    retention_ready: boolean;
    operational_ready: boolean;
    checked_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function countWhere<T extends Record<string, unknown>>(
    db: MySql2Database<any>,
    query: Promise<T[]>,
): Promise<number> {
    const rows = await query;
    return rows.length;
}

// ── Dimension Validators ──────────────────────────────────────────────────────

/** acquisition_ready: ≥1 attribution click with UTM source OR ≥1 funnel event with utm_source */
async function checkAcquisitionReady(db: MySql2Database<any>, tenantId: string): Promise<boolean> {
    const [clickRow, funnelRow] = await Promise.all([
        db
            .select({ cnt: count() })
            .from(attributionClicks)
            .where(and(eq(attributionClicks.tenantId, tenantId), isNotNull(attributionClicks.utmSource))),
        db
            .select({ cnt: count() })
            .from(freightFunnelEvents)
            .where(and(eq(freightFunnelEvents.tenantId, tenantId), isNotNull(freightFunnelEvents.utmSource))),
    ]);
    return Number(clickRow[0]?.cnt ?? 0) > 0 || Number(funnelRow[0]?.cnt ?? 0) > 0;
}

/** conversion_ready: ≥1 funnel event with stage QUOTE_SENT or CEP_RECEIVED */
async function checkConversionReady(db: MySql2Database<any>, tenantId: string): Promise<boolean> {
    const rows = await db
        .select({ cnt: count() })
        .from(freightFunnelEvents)
        .where(
            and(
                eq(freightFunnelEvents.tenantId, tenantId),
                sql`${freightFunnelEvents.stage} IN ('QUOTE_SENT', 'CEP_RECEIVED', 'FREIGHT_QUOTED')`,
            ),
        );
    return Number(rows[0]?.cnt ?? 0) > 0;
}

/** revenue_ready: ≥1 simulation with best_price IS NOT NULL */
async function checkRevenueReady(db: MySql2Database<any>, tenantId: string): Promise<boolean> {
    const rows = await db
        .select({ cnt: count() })
        .from(simulations)
        .where(
            and(
                eq(simulations.tenantId, tenantId),
                isNotNull(simulations.bestPrice),
            ),
        );
    return Number(rows[0]?.cnt ?? 0) > 0;
}

/** retention_ready: ≥1 inbound message for this tenant */
async function checkRetentionReady(db: MySql2Database<any>, tenantId: string): Promise<boolean> {
    const rows = await db
        .select({ cnt: count() })
        .from(messages)
        .where(eq(messages.tenantId, tenantId));
    return Number(rows[0]?.cnt ?? 0) > 0;
}

/** operational_ready: tenant exists AND ≥1 user exists for this tenant */
async function checkOperationalReady(db: MySql2Database<any>, tenantId: string): Promise<boolean> {
    const [tenantRows, userRows] = await Promise.all([
        db.select({ id: tenants.id }).from(tenants).where(eq(tenants.id, tenantId)).limit(1),
        db.select({ cnt: count() }).from(users).where(eq(users.tenantId, tenantId)),
    ]);
    return tenantRows.length > 0 && Number(userRows[0]?.cnt ?? 0) > 0;
}

// ── Main Validator ────────────────────────────────────────────────────────────

export async function validateTenantDataContract(
    tenantId: string,
    db: MySql2Database<any>,
): Promise<TenantDataContractResult> {
    const checkedAt = new Date().toISOString();

    const [acquisition_ready, conversion_ready, revenue_ready, retention_ready, operational_ready] =
        await Promise.all([
            checkAcquisitionReady(db, tenantId),
            checkConversionReady(db, tenantId),
            checkRevenueReady(db, tenantId),
            checkRetentionReady(db, tenantId),
            checkOperationalReady(db, tenantId),
        ]);

    const allReady =
        acquisition_ready && conversion_ready && revenue_ready && retention_ready && operational_ready;

    const missing = [
        !acquisition_ready && 'acquisition',
        !conversion_ready && 'conversion',
        !revenue_ready && 'revenue',
        !retention_ready && 'retention',
        !operational_ready && 'operational',
    ].filter(Boolean);

    if (allReady) {
        structuredLogger.info('tenant_data_contract_ready', {
            tenantId,
            eventType: 'tenant_data_contract_ready',
        });
    } else {
        structuredLogger.warn('tenant_data_contract_missing', {
            tenantId,
            eventType: 'tenant_data_contract_missing',
            missing,
        });
    }

    return {
        tenantId,
        acquisition_ready,
        conversion_ready,
        revenue_ready,
        retention_ready,
        operational_ready,
        checked_at: checkedAt,
    };
}
