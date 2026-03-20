import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { QueryBuilder } from 'drizzle-orm/mysql-core';
import { orders, shipments } from '@/drizzle/schema';
import { activeJoin, softDeletePatch, withTenantIdNotDeleted, withTenantNotDeleted } from '../db';

const qb = new QueryBuilder();

describe('db soft delete helpers', () => {
    it('adds deleted_at is null to tenant-scoped filters', () => {
        const query = qb.select()
            .from(orders)
            .where(withTenantNotDeleted(orders, 'tenant-1', eq(orders.customerId, 'customer-1')))
            .toSQL();

        expect(query.sql).toContain('`orders`.`deleted_at` is null');
        expect(query.params).toEqual(['tenant-1', 'customer-1']);
    });

    it('adds tenant, id and deleted_at filters to point lookups', () => {
        const query = qb.select()
            .from(orders)
            .where(withTenantIdNotDeleted(orders, 'tenant-1', 'order-1'))
            .toSQL();

        expect(query.sql).toContain('`orders`.`deleted_at` is null');
        expect(query.sql).toContain('`orders`.`tenant_id` = ?');
        expect(query.sql).toContain('`orders`.`id` = ?');
        expect(query.params).toEqual(['tenant-1', 'order-1']);
    });

    it('adds deleted_at filtering to joins and emits a soft delete patch', () => {
        const query = qb.select()
            .from(orders)
            .leftJoin(shipments, activeJoin(shipments, eq(shipments.orderId, orders.id)))
            .where(eq(orders.id, 'order-1'))
            .toSQL();

        expect(query.sql).toContain('`shipments`.`deleted_at` is null');

        const patch = softDeletePatch();
        expect(patch.deletedAt).toBeInstanceOf(Date);
        expect(Object.keys(patch)).toEqual(['deletedAt']);
    });
});
