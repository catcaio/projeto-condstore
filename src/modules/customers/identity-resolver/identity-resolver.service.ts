import { getDb } from '@/infra/db';
import { eq, and } from 'drizzle-orm';
import { customerContacts, organizations, customers } from '@/drizzle/schema';
import { normalizePhone, hashPhone } from '@/lib/phone/normalize-phone';
import { structuredLogger } from '@/infra/log/logger';
import type { IdentityResolutionResult } from './identity-resolver.types';

export async function resolveCustomerByPhone(
    tenantId: string,
    phone: string
): Promise<IdentityResolutionResult | null> {
    const normalized = normalizePhone(phone);
    if (!normalized) {
        return null;
    }

    const hashed = hashPhone(normalized);

    try {
        const db = await getDb();
        const contactRecords = await db
            .select({
                contactId: customerContacts.id,
                organizationId: customerContacts.organizationId,
                customerId: customerContacts.customerId, // fallback if orgId strictly not updated
            })
            .from(customerContacts)
            .where(
                and(
                    eq(customerContacts.tenantId, tenantId),
                    eq(customerContacts.phoneHash, hashed)
                )
            )
            .limit(1);

        if (contactRecords.length === 0) {
            return null;
        }

        const match = contactRecords[0];

        let orgId = match.organizationId;
        
        // Safety net: If organizationId is not yet migrated down to customerContacts, fetch it from customer
        if (!orgId && match.customerId) {
            const orgRecords = await db
                .select({ organizationId: customers.organizationId })
                .from(customers)
                .where(
                    and(
                        eq(customers.tenantId, tenantId),
                        eq(customers.id, match.customerId)
                    )
                )
                .limit(1);
            orgId = orgRecords.length > 0 ? orgRecords[0].organizationId : null;
        }

        return {
            contactId: match.contactId,
            customerId: match.customerId ?? null,
            organizationId: orgId,
            confidenceScore: 1.0, // Direct hash match implies 100% confidence
        };
    } catch (error) {
        structuredLogger.error('identity_resolver_failed', {
            tenantId,
            error,
            eventType: 'identity_resolver_error'
        });
        return null;
    }
}
