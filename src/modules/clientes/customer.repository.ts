import { db } from '@/db/client';
import { eq, and, desc } from 'drizzle-orm';
import { customers, customerContacts, organizations, orders, freightSimulations } from '@/drizzle/schema';
import { createHash } from 'node:crypto';

/**
 * Hash phone number using SHA-256 for privacy-safe storage.
 */
export function hashPhone(phone: string): string {
    return createHash('sha256').update(phone.trim()).digest('hex');
}

/**
 * Extract last 4 digits of a phone number for display purposes.
 */
export function phoneLast4(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits.slice(-4);
}

/**
 * Fetches the canonical customer entity along with its parent organization
 * and all associated contacts.
 */
export async function getCustomerWithContext(tenantId: string, customerId: string) {
    const customerRecords = await db
        .select({
            customer: customers,
            organization: organizations,
        })
        .from(customers)
        .innerJoin(organizations, eq(customers.organizationId, organizations.id))
        .where(
            and(
                eq(customers.tenantId, tenantId),
                eq(customers.id, customerId)
            )
        )
        .limit(1);

    if (customerRecords.length === 0) {
        return null;
    }

    const rec = customerRecords[0];

    const contacts = await db
        .select()
        .from(customerContacts)
        .where(
            and(
                eq(customerContacts.tenantId, tenantId),
                eq(customerContacts.customerId, customerId)
            )
        );

    const recentOrders = await db
        .select()
        .from(orders)
        .where(
            and(
                eq(orders.tenantId, tenantId),
                eq(orders.customerId, customerId)
            )
        )
        .orderBy(desc(orders.createdAt))
        .limit(10);

    const recentSimulations = await db
        .select()
        .from(freightSimulations)
        .where(eq(freightSimulations.tenantId, tenantId))
        .orderBy(desc(freightSimulations.createdAt))
        .limit(10);

    return {
        customer: rec.customer,
        organization: rec.organization,
        contacts,
        recentOrders,
        recentSimulations,
    };
}
