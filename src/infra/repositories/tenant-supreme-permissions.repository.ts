import { eq } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import { structuredLogger } from '@/infra/log/logger';
import { tenantSupremePermissions, type TenantSupremePermissionsRecord } from '@/drizzle/schema';

// ── Default permissions (mirrors schema defaults) ─────────────────────────────
export const DEFAULT_SUPREME_PERMISSIONS: Omit<TenantSupremePermissionsRecord, 'tenantId' | 'updatedAt'> = {
    allowReadMetrics: true,
    allowGenerateRecommendations: true,
    allowExecuteOptimizations: false,
    allowAdsBudgetChanges: false,
    allowCrmActions: false,
    allowWhatsappAutomation: true,
};

export type UpdateSupremePermissionsPayload = Partial<Omit<TenantSupremePermissionsRecord, 'tenantId' | 'updatedAt'>>;

export class TenantSupremePermissionsRepository {
    /**
     * Returns the tenant's supreme permissions, falling back to defaults
     * if no row exists yet (lazy initialization pattern).
     */
    async getTenantSupremePermissions(tenantId: string): Promise<TenantSupremePermissionsRecord> {
        if (!tenantId) throw new Error('tenantId is required');

        const db = await getDb();
        const rows = await db
            .select()
            .from(tenantSupremePermissions)
            .where(eq(tenantSupremePermissions.tenantId, tenantId));

        if (rows.length > 0) {
            return rows[0];
        }

        // Return defaults without persisting — permissions only persist on first explicit write
        structuredLogger.info('supreme_permissions_not_found_using_defaults', {
            tenantId,
            eventType: 'supreme_permissions_defaults',
        });

        return {
            tenantId,
            ...DEFAULT_SUPREME_PERMISSIONS,
            updatedAt: new Date(),
        };
    }

    /**
     * Upserts supreme permissions for a tenant.
     */
    async updateTenantSupremePermissions(
        tenantId: string,
        payload: UpdateSupremePermissionsPayload,
    ): Promise<TenantSupremePermissionsRecord> {
        if (!tenantId) throw new Error('tenantId is required');

        const db = await getDb();

        const existing = await db
            .select({ tenantId: tenantSupremePermissions.tenantId })
            .from(tenantSupremePermissions)
            .where(eq(tenantSupremePermissions.tenantId, tenantId));

        if (existing.length > 0) {
            await db
                .update(tenantSupremePermissions)
                .set({ ...payload, updatedAt: new Date() })
                .where(eq(tenantSupremePermissions.tenantId, tenantId));
        } else {
            await db.insert(tenantSupremePermissions).values({
                tenantId,
                ...DEFAULT_SUPREME_PERMISSIONS,
                ...payload,
                updatedAt: new Date(),
            });
        }

        structuredLogger.info('supreme_permissions_updated', {
            tenantId,
            eventType: 'supreme_permissions_updated',
            changes: Object.keys(payload),
        });

        return this.getTenantSupremePermissions(tenantId);
    }
}

export const tenantSupremePermissionsRepository = new TenantSupremePermissionsRepository();
