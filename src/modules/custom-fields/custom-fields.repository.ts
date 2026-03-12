import { getDb } from '@/infra/db';
import { tenantCustomFields, entityCustomValues } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { CreateCustomFieldDto, UpdateCustomFieldDto, CustomFieldDefinition, CustomFieldEntity, CustomFieldValue } from './custom-fields.types';

export class CustomFieldsRepository {
    async create(tenantId: string, input: CreateCustomFieldDto): Promise<CustomFieldDefinition> {
        const db = await getDb();
        const id = crypto.randomUUID();

        await db.insert(tenantCustomFields).values({
            id,
            tenantId,
            entity: input.entity,
            fieldKey: input.fieldKey,
            label: input.label,
            type: input.type,
            required: input.required,
            options: input.options,
        });

        const created = await this.getById(tenantId, id);
        if (!created) throw new Error('Failed to fetch after create');
        return created;
    }

    async getById(tenantId: string, id: string): Promise<CustomFieldDefinition | null> {
        const db = await getDb();
        const records = await db
            .select()
            .from(tenantCustomFields)
            .where(
                and(
                    eq(tenantCustomFields.tenantId, tenantId),
                    eq(tenantCustomFields.id, id)
                )
            )
            .limit(1);

        if (records.length === 0) return null;
        
        const r = records[0];
        return {
            id: r.id,
            tenantId: r.tenantId,
            entity: r.entity as CustomFieldEntity,
            fieldKey: r.fieldKey,
            label: r.label,
            type: r.type as any,
            required: r.required,
            options: r.options as string[] | null,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
        };
    }

    async listByEntity(tenantId: string, entity: CustomFieldEntity): Promise<CustomFieldDefinition[]> {
        const db = await getDb();
        const records = await db
            .select()
            .from(tenantCustomFields)
            .where(
                and(
                    eq(tenantCustomFields.tenantId, tenantId),
                    eq(tenantCustomFields.entity, entity)
                )
            );

        return records.map(r => ({
            id: r.id,
            tenantId: r.tenantId,
            entity: r.entity as CustomFieldEntity,
            fieldKey: r.fieldKey,
            label: r.label,
            type: r.type as any,
            required: r.required,
            options: r.options as string[] | null,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
        }));
    }

    async update(tenantId: string, id: string, input: UpdateCustomFieldDto): Promise<CustomFieldDefinition | null> {
        const db = await getDb();
        
        const updates: any = {};
        if (input.label !== undefined) updates.label = input.label;
        if (input.required !== undefined) updates.required = input.required;
        if (input.options !== undefined) updates.options = input.options;
        
        if (Object.keys(updates).length > 0) {
            await db
                .update(tenantCustomFields)
                .set(updates)
                .where(
                    and(
                        eq(tenantCustomFields.tenantId, tenantId),
                        eq(tenantCustomFields.id, id)
                    )
                );
        }

        return this.getById(tenantId, id);
    }

    async delete(tenantId: string, id: string): Promise<boolean> {
        const db = await getDb();
        
        // Technically we should delete `entityCustomValues` for this key, 
        // or let them orphan. Let's let them orphan or have a cleaner job.
        
        const result = await db
            .delete(tenantCustomFields)
            .where(
                and(
                    eq(tenantCustomFields.tenantId, tenantId),
                    eq(tenantCustomFields.id, id)
                )
            );

        return result[0].affectedRows > 0;
    }

    // --- Entity Values ---

    async setValues(tenantId: string, entity: string, entityId: string, values: CustomFieldValue[]): Promise<void> {
        const db = await getDb();

        for (const v of values) {
            if (v.value === null || v.value === '') {
                // Remove value
                await db
                    .delete(entityCustomValues)
                    .where(
                        and(
                            eq(entityCustomValues.tenantId, tenantId),
                            eq(entityCustomValues.entityId, entityId),
                            eq(entityCustomValues.fieldKey, v.fieldKey)
                        )
                    );
            } else {
                // Upsert value
                await db.insert(entityCustomValues).values({
                    id: crypto.randomUUID(),
                    tenantId,
                    entity,
                    entityId,
                    fieldKey: v.fieldKey,
                    value: v.value,
                }).onDuplicateKeyUpdate({
                    set: {
                        value: v.value
                    }
                });
            }
        }
    }

    async getValues(tenantId: string, entityId: string): Promise<Record<string, string>> {
        const db = await getDb();
        const records = await db
            .select()
            .from(entityCustomValues)
            .where(
                and(
                    eq(entityCustomValues.tenantId, tenantId),
                    eq(entityCustomValues.entityId, entityId)
                )
            );

        const result: Record<string, string> = {};
        for (const r of records) {
            if (r.value !== null) {
                result[r.fieldKey] = r.value;
            }
        }
        return result;
    }
}

export const customFieldsRepository = new CustomFieldsRepository();
