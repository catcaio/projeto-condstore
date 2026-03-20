import { db } from '@/db/client';
import { eq, and, desc, like, isNotNull, or, ne } from 'drizzle-orm';
import { customers, customerContacts, organizations, orders, freightSimulations } from '@/drizzle/schema';
import { createHash } from 'node:crypto';
import { normalizePhone } from '@/lib/phone';
import { decryptString } from '@/infra/pii/crypto';
import { withTenantNotDeleted } from '@/infra/db';

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
 * Safely decrypt a PII string, returning null if decryption fails
 * (e.g. null input, invalid ciphertext, or key rotation).
 */
function safeDecrypt(encrypted: string | null | undefined): string | null {
    if (!encrypted) return null;
    try {
        return decryptString(encrypted);
    } catch {
        return null;
    }
}


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
                eq(customers.id, customerId),
                ne(organizations.status, 'merged'),
            )
        )
        .limit(1);

    if (customerRecords.length === 0) {
        return null;
    }

    const rec = customerRecords[0];

    const rawContacts = await db
        .select()
        .from(customerContacts)
        .where(
            and(
                eq(customerContacts.tenantId, tenantId),
                eq(customerContacts.customerId, customerId)
            )
        );

    const contacts = rawContacts.map(c => ({
        ...c,
        phone: safeDecrypt(c.phoneEncrypted),
        email: safeDecrypt(c.emailEncrypted),
    }));

    const recentOrders = await db
        .select()
        .from(orders)
        .where(withTenantNotDeleted(orders, tenantId, eq(orders.customerId, customerId)))
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

function digitsOnly(value: string): string {
    return value.replace(/\D/g, '');
}

function phonesMatch(inputPhone: string, candidatePhone: string): boolean {
    const normalizedInput = normalizePhone(inputPhone);
    const normalizedCandidate = normalizePhone(candidatePhone);

    if (!normalizedInput || !normalizedCandidate) {
        return false;
    }

    if (normalizedInput === normalizedCandidate) {
        return true;
    }

    const inputDigits = digitsOnly(normalizedInput);
    const candidateDigits = digitsOnly(normalizedCandidate);

    if (!inputDigits || !candidateDigits) {
        return false;
    }

    return (
        inputDigits === candidateDigits ||
        inputDigits.endsWith(candidateDigits) ||
        candidateDigits.endsWith(inputDigits)
    );
}

export async function findCustomerReferenceByPhone(tenantId: string, phone: string) {
    const normalizedPhone = normalizePhone(phone);
    const phoneDigits = digitsOnly(normalizedPhone);
    const phoneSuffix = phoneDigits.slice(-8);

    if (!normalizedPhone || !phoneDigits || phoneSuffix.length < 8) {
        return null;
    }

    const candidates = await db
        .select({
            customerId: customerContacts.customerId,
            organizationId: customers.organizationId,
            phoneEncrypted: customerContacts.phoneEncrypted,
        })
        .from(customerContacts)
        .innerJoin(
            customers,
            and(
                eq(customerContacts.customerId, customers.id),
                eq(customers.tenantId, tenantId),
            ),
        )
        .where(
            and(
                eq(customerContacts.tenantId, tenantId),
                isNotNull(customerContacts.phoneHash),
                or(
                    eq(customerContacts.phoneHash, hashPhone(normalizedPhone)),
                    eq(customerContacts.phoneHash, hashPhone('55' + normalizedPhone)),
                    eq(customerContacts.phoneHash, hashPhone('+' + normalizedPhone)),
                    eq(customerContacts.phoneHash, hashPhone('+55' + normalizedPhone))
                ),
            ),
        )
        .limit(25);

    const matches = candidates.filter((candidate) => {
        if (!candidate.phoneEncrypted) {
            return false;
        }

        const phone = safeDecrypt(candidate.phoneEncrypted);
        return phone !== null && phonesMatch(normalizedPhone, phone);
    });

    const uniqueMatches = new Map(
        matches.map((match) => [
            match.customerId,
            {
                customerId: match.customerId,
                organizationId: match.organizationId,
            },
        ]),
    );

    return uniqueMatches.size === 1
        ? Array.from(uniqueMatches.values())[0]
        : null;
}
