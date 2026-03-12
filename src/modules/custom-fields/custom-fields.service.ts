import { customFieldsRepository, CustomFieldsRepository } from './custom-fields.repository';
import { CreateCustomFieldDto, UpdateCustomFieldDto, CustomFieldDefinition, CustomFieldEntity, CustomFieldValue } from './custom-fields.types';
import { emitCustomFieldCreated, emitCustomFieldUpdated, emitCustomFieldDeleted, emitCustomFieldValueSet } from './custom-fields.events';

export class CustomFieldsService {
    constructor(private readonly repo: CustomFieldsRepository = customFieldsRepository) {}

    async createField(tenantId: string, input: CreateCustomFieldDto, operatorId?: string): Promise<CustomFieldDefinition> {
        // Validation: Ensure fieldKey is unique for the entity/tenant combo
        const existing = await this.repo.listByEntity(tenantId, input.entity);
        if (existing.some(f => f.fieldKey === input.fieldKey)) {
            throw new Error(`Field key '${input.fieldKey}' already exists for entity '${input.entity}'`);
        }

        const field = await this.repo.create(tenantId, input);
        await emitCustomFieldCreated(tenantId, field.id, field.entity, field.fieldKey, operatorId);
        return field;
    }

    async updateField(tenantId: string, id: string, input: UpdateCustomFieldDto, operatorId?: string): Promise<CustomFieldDefinition> {
        const field = await this.repo.getById(tenantId, id);
        if (!field) {
            throw new Error('Custom field not found');
        }

        const updated = await this.repo.update(tenantId, id, input);
        if (!updated) {
            throw new Error('Failed to update custom field');
        }

        await emitCustomFieldUpdated(tenantId, updated.id, updated.entity, updated.fieldKey, operatorId);
        return updated;
    }

    async deleteField(tenantId: string, id: string, operatorId?: string): Promise<boolean> {
        const field = await this.repo.getById(tenantId, id);
        if (!field) {
            return false;
        }

        const success = await this.repo.delete(tenantId, id);
        if (success) {
            await emitCustomFieldDeleted(tenantId, field.id, field.entity, field.fieldKey, operatorId);
        }
        return success;
    }

    async getFields(tenantId: string, entity: CustomFieldEntity): Promise<CustomFieldDefinition[]> {
        return this.repo.listByEntity(tenantId, entity);
    }

    async setEntityValues(
        tenantId: string,
        entity: CustomFieldEntity,
        entityId: string,
        values: CustomFieldValue[],
        operatorId?: string
    ): Promise<void> {
        const definitions = await this.repo.listByEntity(tenantId, entity);
        
        // Ensure values only contain valid field keys
        const validKeys = new Set(definitions.map(d => d.fieldKey));
        const filteredValues = values.filter(v => validKeys.has(v.fieldKey));

        await this.repo.setValues(tenantId, entity, entityId, filteredValues);

        for (const v of filteredValues) {
            await emitCustomFieldValueSet(tenantId, entity, entityId, v.fieldKey, operatorId);
        }
    }

    async getEntityValues(tenantId: string, entityId: string): Promise<Record<string, string>> {
        return this.repo.getValues(tenantId, entityId);
    }
}

export const customFieldsService = new CustomFieldsService();
