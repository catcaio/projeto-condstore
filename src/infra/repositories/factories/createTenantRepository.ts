/**
 * Tenant Repository Factory.
 *
 * Creates tenant-scoped query wrappers that automatically apply
 * `WHERE tenant_id = :tenantId` to every query, preventing
 * cross-tenant data leakage.
 *
 * Usage:
 *   const repo = createTenantRepository(orders, tenantId);
 *   const rows = await repo.findAll();
 *   // automatically filtered by tenantId
 */

import { getDb } from '@/infra/db';
import { eq, and } from 'drizzle-orm';
import type { MySqlTable } from 'drizzle-orm/mysql-core';
import { randomUUID } from 'crypto';

interface TenantScopedTable {
    id: ReturnType<typeof import('drizzle-orm/mysql-core').varchar>;
    tenantId: ReturnType<typeof import('drizzle-orm/mysql-core').varchar>;
}

/**
 * Create a tenant-scoped repository for any table with id + tenantId columns.
 * All operations automatically enforce tenant isolation.
 */
export function createTenantRepository<T extends Record<string, unknown>>(
    table: MySqlTable & TenantScopedTable,
    tenantId: string,
) {
    return {
        /**
         * Find all rows scoped to tenant.
         */
        async findAll(): Promise<T[]> {
            const db = await getDb();
            const rows = await db.select()
                .from(table)
                .where(eq(table.tenantId, tenantId));
            return rows as T[];
        },

        /**
         * Find a single row by ID, scoped to tenant.
         */
        async findById(id: string): Promise<T | null> {
            const db = await getDb();
            const [row] = await db.select()
                .from(table)
                .where(and(
                    eq(table.id, id),
                    eq(table.tenantId, tenantId),
                ))
                .limit(1);
            return (row as T) ?? null;
        },

        /**
         * Insert a new row, auto-injecting tenantId.
         */
        async insert(data: Omit<T, 'id' | 'tenantId'>): Promise<string> {
            const db = await getDb();
            const id = randomUUID();
            await db.insert(table).values({
                ...data,
                id,
                tenantId,
            } as Record<string, unknown>);
            return id;
        },

        /**
         * Update a row by ID, scoped to tenant.
         */
        async update(id: string, data: Partial<T>): Promise<void> {
            const db = await getDb();
            await db.update(table)
                .set(data as Record<string, unknown>)
                .where(and(
                    eq(table.id, id),
                    eq(table.tenantId, tenantId),
                ));
        },

        /**
         * Delete a row by ID, scoped to tenant.
         */
        async delete(id: string): Promise<void> {
            const db = await getDb();
            await db.delete(table)
                .where(and(
                    eq(table.id, id),
                    eq(table.tenantId, tenantId),
                ));
        },
    };
}

// ─── Convenience Aliases ────────────────────────────────────────────────────

import { domineOrders, customers, freightShipments } from '@/drizzle/schema';

export function createOrderRepository(tenantId: string) {
    return createTenantRepository(domineOrders as unknown as MySqlTable & TenantScopedTable, tenantId);
}

export function createCustomerRepository(tenantId: string) {
    return createTenantRepository(customers as unknown as MySqlTable & TenantScopedTable, tenantId);
}

export function createShipmentRepository(tenantId: string) {
    return createTenantRepository(freightShipments as unknown as MySqlTable & TenantScopedTable, tenantId);
}
