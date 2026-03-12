import { getDb } from '@/infra/db';
import { tenantConfigurations } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { SetConfigInput, GetConfigOutput } from './config.types';

export class ConfigRepository {
    async get(tenantId: string, key: string): Promise<GetConfigOutput | null> {
        const db = await getDb();
        const records = await db
            .select()
            .from(tenantConfigurations)
            .where(
                and(
                    eq(tenantConfigurations.tenantId, tenantId),
                    eq(tenantConfigurations.key, key)
                )
            )
            .limit(1);

        if (records.length === 0) {
            return null;
        }

        const r = records[0];
        return {
            id: r.id,
            key: r.key,
            value: r.value,
            category: r.category as any,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            createdBy: r.createdBy,
        };
    }

    async list(tenantId: string, category?: string): Promise<GetConfigOutput[]> {
        const db = await getDb();
        const conditions = [eq(tenantConfigurations.tenantId, tenantId)];
        if (category) {
            conditions.push(eq(tenantConfigurations.category, category));
        }

        const records = await db
            .select()
            .from(tenantConfigurations)
            .where(and(...conditions));

        return records.map(r => ({
            id: r.id,
            key: r.key,
            value: r.value,
            category: r.category as any,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            createdBy: r.createdBy,
        }));
    }

    async upsert(input: SetConfigInput): Promise<GetConfigOutput> {
        const db = await getDb();
        
        await db.insert(tenantConfigurations).values({
            id: crypto.randomUUID(),
            tenantId: input.tenantId,
            key: input.key,
            value: input.value,
            category: input.category,
            createdBy: input.createdBy,
        }).onDuplicateKeyUpdate({
            set: {
                value: input.value,
                category: input.category,
                createdBy: input.createdBy,
            }
        });

        // Fetch back to get full updated record
        const updated = await this.get(input.tenantId, input.key);
        if (!updated) {
            throw new Error('Failed to fetch config after upsert');
        }
        return updated;
    }

    async remove(tenantId: string, key: string): Promise<boolean> {
        const db = await getDb();
        const result = await db
            .delete(tenantConfigurations)
            .where(
                and(
                    eq(tenantConfigurations.tenantId, tenantId),
                    eq(tenantConfigurations.key, key)
                )
            );

        return result[0].affectedRows > 0;
    }
}

export const configRepository = new ConfigRepository();
