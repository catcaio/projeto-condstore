import { eq, and } from 'drizzle-orm';
import { getDb } from '../db';
import { tenantSecrets } from '../../drizzle/schema';
import type { TenantSecretRecord, NewTenantSecretRecord } from '../../drizzle/schema';

export const tenantSecretsRepository = {
    async getByKeyName(tenantId: string, scope: string, keyName: string): Promise<TenantSecretRecord | undefined> {
        const db = await getDb();
        const result = await db.select()
            .from(tenantSecrets)
            .where(and(
                eq(tenantSecrets.tenantId, tenantId),
                eq(tenantSecrets.scope, scope),
                eq(tenantSecrets.keyName, keyName)
            ))
            .limit(1);
        return result[0];
    },

    async getMetadataByTenant(tenantId: string) {
        const db = await getDb();
        const results = await db.select({
            id: tenantSecrets.id,
            scope: tenantSecrets.scope,
            keyName: tenantSecrets.keyName,
            lastRotatedAt: tenantSecrets.lastRotatedAt,
            rotatedByUserId: tenantSecrets.rotatedByUserId,
            createdAt: tenantSecrets.createdAt,
            updatedAt: tenantSecrets.updatedAt,
        })
            .from(tenantSecrets)
            .where(eq(tenantSecrets.tenantId, tenantId));

        return results;
    },

    async upsertSecret(data: NewTenantSecretRecord) {
        const db = await getDb();
        // Insert new or update if existing on tenantId + scope + keyName
        await db.insert(tenantSecrets).values(data)
            .onDuplicateKeyUpdate({
                set: {
                    valueEncrypted: data.valueEncrypted,
                    valueHash: data.valueHash,
                    lastRotatedAt: data.lastRotatedAt,
                    rotatedByUserId: data.rotatedByUserId || null,
                }
            });
    },
};
