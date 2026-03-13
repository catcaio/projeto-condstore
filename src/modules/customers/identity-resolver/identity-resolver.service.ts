import { and, eq, inArray } from 'drizzle-orm';
import { customerContacts, customers } from '@/drizzle/schema';
import { getDb } from '@/infra/db';
import { structuredLogger } from '@/infra/log/logger';
import {
    hashPhone,
    normalizePhone,
    normalizeWhatsAppPhone,
    toWhatsAppPhone,
} from '@/lib/phone/normalize-phone';
import type { IdentityResolutionResult } from './identity-resolver.types';

export interface IdentityResolution {
    contactId: string | null;
    customerId: string | null;
    organizationId: string | null;
    confidenceScore?: number;
}

type ContactMatch = {
    contactId: string;
    customerId: string;
    organizationId: string | null;
    isPrimary: boolean;
    updatedAt: Date;
};

function buildCandidatePhoneHashes(phone: string): string[] {
    const e164 = normalizePhone(phone);
    if (!e164) return [];

    const digits = e164.replace(/\D/g, '');
    const localDigits = digits.startsWith('55') ? digits.slice(2) : digits;
    const whatsappAddress = toWhatsAppPhone(e164);
    const normalizedWhatsAppPhone = normalizeWhatsAppPhone(phone);

    const candidates = [
        e164,
        digits,
        localDigits,
        whatsappAddress,
        normalizedWhatsAppPhone,
        phone.trim(),
    ].filter((value): value is string => Boolean(value && value.trim()));

    return Array.from(new Set(candidates.map((value) => hashPhone(value))));
}

function sortMatches(matches: ContactMatch[]): ContactMatch[] {
    return [...matches].sort((left, right) => {
        if (left.isPrimary !== right.isPrimary) {
            return Number(right.isPrimary) - Number(left.isPrimary);
        }

        return right.updatedAt.getTime() - left.updatedAt.getTime();
    });
}

async function resolveOrganizationId(
    tenantId: string,
    customerId: string,
    fallbackOrganizationId: string | null,
): Promise<string | null> {
    if (fallbackOrganizationId) {
        return fallbackOrganizationId;
    }

    const db = await getDb();
    const [customer] = await db
        .select({ organizationId: customers.organizationId })
        .from(customers)
        .where(and(eq(customers.tenantId, tenantId), eq(customers.id, customerId)))
        .limit(1);

    return customer?.organizationId ?? null;
}

export async function resolveCustomerByPhone(
    tenantId: string,
    phone: string,
): Promise<IdentityResolutionResult | null> {
    const candidateHashes = buildCandidatePhoneHashes(phone);
    if (candidateHashes.length === 0) {
        return null;
    }

    try {
        const db = await getDb();
        const matches = await db
            .select({
                contactId: customerContacts.id,
                customerId: customerContacts.customerId,
                organizationId: customerContacts.organizationId,
                isPrimary: customerContacts.isPrimary,
                updatedAt: customerContacts.updatedAt,
            })
            .from(customerContacts)
            .where(
                and(
                    eq(customerContacts.tenantId, tenantId),
                    inArray(customerContacts.phoneHash, candidateHashes),
                ),
            )
            .limit(10);

        if (matches.length === 0) {
            return null;
        }

        const bestMatch = sortMatches(matches)[0];
        const organizationId = await resolveOrganizationId(
            tenantId,
            bestMatch.customerId,
            bestMatch.organizationId,
        );

        return {
            contactId: bestMatch.contactId,
            customerId: bestMatch.customerId,
            organizationId,
            confidenceScore: 1,
        };
    } catch (error) {
        structuredLogger.error('identity_resolver_failed', {
            tenantId,
            phoneHashCandidates: candidateHashes.length,
            errorType: error instanceof Error ? error.name : 'UnknownError',
            errorMessage: error instanceof Error ? error.message : String(error),
            eventType: 'identity_resolver_error',
        });
        return null;
    }
}

export const identityResolverService = {
    async resolveByPhone(tenantId: string, phone: string): Promise<IdentityResolution> {
        const match = await resolveCustomerByPhone(tenantId, phone);
        if (!match) {
            return {
                contactId: null,
                customerId: null,
                organizationId: null,
            };
        }

        return match;
    },
};
