import { getDb } from '@/infra/db';
import { organizations, conversations, customerContacts, customers } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { createHash } from 'crypto';
import { structuredLogger as logger } from '@/infra/log/logger';

/** Strip all non-digit chars and validate 14 digits. */
export function sanitizeCnpj(raw: string): string | null {
    const digits = raw.replace(/\D/g, '');
    return digits.length === 14 ? digits : null;
}

/** Tenant-scoped SHA-256 hash for CNPJ. */
export function hashCnpj(cnpjDigits: string, tenantId: string): string {
    return createHash('sha256').update(cnpjDigits + tenantId).digest('hex');
}

export interface UpdateCnpjInput {
    tenantId: string;
    organizationId: string;
    cnpj: string;
    legalName?: string;
    tradeName?: string;
    requestId: string;
}

export interface UpdateCnpjResult {
    ok: boolean;
    merged: boolean;
    canonicalOrganizationId: string;
    error?: string;
}

export const organizationService = {
    async updateOrganizationCnpj(input: UpdateCnpjInput): Promise<UpdateCnpjResult> {
        const { tenantId, organizationId, cnpj, legalName, tradeName, requestId } = input;

        const cnpjDigits = sanitizeCnpj(cnpj);
        if (!cnpjDigits) {
            return { ok: false, merged: false, canonicalOrganizationId: organizationId, error: 'CNPJ inválido (deve conter 14 dígitos)' };
        }

        const cnpjHash = hashCnpj(cnpjDigits, tenantId);
        const db = await getDb();

        // 1. Load current org
        const [currentOrg] = await db.select().from(organizations)
            .where(and(eq(organizations.id, organizationId), eq(organizations.tenantId, tenantId)))
            .limit(1);

        if (!currentOrg) {
            return { ok: false, merged: false, canonicalOrganizationId: organizationId, error: 'Organization não encontrada' };
        }

        // 2. Check for conflict: another org in same tenant with same cnpjHash
        const [conflictOrg] = await db.select().from(organizations)
            .where(and(
                eq(organizations.tenantId, tenantId),
                eq(organizations.cnpjHash, cnpjHash),
            ))
            .limit(1);

        // No conflict, or conflict is self → simple update
        if (!conflictOrg || conflictOrg.id === organizationId) {
            const updatePayload: Record<string, unknown> = { cnpjHash };
            if (legalName) updatePayload.legalName = legalName.trim();
            if (tradeName) updatePayload.tradeName = tradeName.trim();

            await db.update(organizations)
                .set(updatePayload)
                .where(and(eq(organizations.id, organizationId), eq(organizations.tenantId, tenantId)));

            logger.info('organization_cnpj_updated', {
                tenantId,
                organizationId,
                requestId,
            });

            return { ok: true, merged: false, canonicalOrganizationId: organizationId };
        }

        // 3. Conflict exists → merge
        // Canonical = the one that already has the real CNPJ
        const canonicalId = conflictOrg.id;
        const duplicateId = organizationId;

        await db.transaction(async (tx) => {
            // Move conversations
            await tx.update(conversations)
                .set({ organizationId: canonicalId })
                .where(and(
                    eq(conversations.tenantId, tenantId),
                    eq(conversations.organizationId, duplicateId),
                ));

            // Move customer contacts
            await tx.update(customerContacts)
                .set({ organizationId: canonicalId })
                .where(and(
                    eq(customerContacts.tenantId, tenantId),
                    eq(customerContacts.organizationId, duplicateId),
                ));

            // Move customers
            await tx.update(customers)
                .set({ organizationId: canonicalId })
                .where(and(
                    eq(customers.tenantId, tenantId),
                    eq(customers.organizationId, duplicateId),
                ));

            // Mark duplicate as merged
            await tx.update(organizations)
                .set({ status: 'merged' })
                .where(and(eq(organizations.id, duplicateId), eq(organizations.tenantId, tenantId)));

            // Optionally update canonical with better names if provided
            if (legalName || tradeName) {
                const nameUpdate: Record<string, unknown> = {};
                if (legalName) nameUpdate.legalName = legalName.trim();
                if (tradeName) nameUpdate.tradeName = tradeName.trim();

                await tx.update(organizations)
                    .set(nameUpdate)
                    .where(and(eq(organizations.id, canonicalId), eq(organizations.tenantId, tenantId)));
            }
        });

        logger.info('organization_merged', {
            tenantId,
            sourceOrganizationId: duplicateId,
            targetOrganizationId: canonicalId,
            requestId,
        });

        return { ok: true, merged: true, canonicalOrganizationId: canonicalId };
    },
};
