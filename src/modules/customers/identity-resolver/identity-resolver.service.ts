import { and, eq, isNotNull, like, or } from 'drizzle-orm';
import { customerContacts, customers } from '@/drizzle/schema';
import { getDb } from '@/infra/db';
import { normalizeWhatsAppPhone } from '@/lib/phone/normalize-phone';

export interface IdentityResolution {
    contactId: string | null;
    customerId: string | null;
    organizationId: string | null;
}

function digitsOnly(value: string): string {
    return value.replace(/\D/g, '');
}

function phonesMatch(inputPhone: string, candidatePhone: string): boolean {
    const normalizedInput = normalizeWhatsAppPhone(inputPhone);
    const normalizedCandidate = normalizeWhatsAppPhone(candidatePhone);
    if (!normalizedInput || !normalizedCandidate) return false;

    if (normalizedInput === normalizedCandidate) return true;

    const inputDigits = digitsOnly(normalizedInput);
    const candidateDigits = digitsOnly(normalizedCandidate);
    return (
        inputDigits === candidateDigits ||
        inputDigits.endsWith(candidateDigits) ||
        candidateDigits.endsWith(inputDigits)
    );
}

export const identityResolverService = {
    async resolveByPhone(tenantId: string, normalizedPhone: string): Promise<IdentityResolution> {
        const db = await getDb();
        const digits = digitsOnly(normalizedPhone);
        const suffix = digits.slice(-8);

        if (!digits || suffix.length < 8) {
            return { contactId: null, customerId: null, organizationId: null };
        }

        const candidates = await db
            .select({
                contactId: customerContacts.id,
                customerId: customerContacts.customerId,
                organizationId: customers.organizationId,
                phone: customerContacts.phone,
            })
            .from(customerContacts)
            .innerJoin(
                customers,
                and(
                    eq(customers.tenantId, tenantId),
                    eq(customers.id, customerContacts.customerId),
                ),
            )
            .where(
                and(
                    eq(customerContacts.tenantId, tenantId),
                    isNotNull(customerContacts.phone),
                    or(
                        like(customerContacts.phone, `%${digits}%`),
                        like(customerContacts.phone, `%${suffix}%`),
                    ),
                ),
            )
            .limit(20);

        const matches = candidates.filter((candidate) => {
            if (!candidate.phone) return false;
            return phonesMatch(normalizedPhone, candidate.phone);
        });

        if (matches.length !== 1) {
            return { contactId: null, customerId: null, organizationId: null };
        }

        const match = matches[0];
        return {
            contactId: match.contactId,
            customerId: match.customerId,
            organizationId: match.organizationId,
        };
    },
};
