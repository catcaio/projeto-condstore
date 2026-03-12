import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import { logger } from '@/infra/logger';
import { CustomFieldEntity } from './custom-fields.types';

export async function emitCustomFieldCreated(
    tenantId: string,
    id: string,
    entity: CustomFieldEntity,
    fieldKey: string,
    operatorId?: string
) {
    try {
        await publishOperationalEvent({
            tenantId,
            eventType: 'custom_field_created',
            eventDomain: 'OPERATIONS',
            entityId: id,
            payload: { entity, fieldKey, operatorId },
        });
    } catch (e) {
        logger.error('Failed to emit custom_field_created event', e as Error, { tenantId, id });
    }
}

export async function emitCustomFieldUpdated(
    tenantId: string,
    id: string,
    entity: CustomFieldEntity,
    fieldKey: string,
    operatorId?: string
) {
    try {
        await publishOperationalEvent({
            tenantId,
            eventType: 'custom_field_updated',
            eventDomain: 'OPERATIONS',
            entityId: id,
            payload: { entity, fieldKey, operatorId },
        });
    } catch (e) {
        logger.error('Failed to emit custom_field_updated event', e as Error, { tenantId, id });
    }
}

export async function emitCustomFieldDeleted(
    tenantId: string,
    id: string,
    entity: CustomFieldEntity,
    fieldKey: string,
    operatorId?: string
) {
    try {
        await publishOperationalEvent({
            tenantId,
            eventType: 'custom_field_deleted',
            eventDomain: 'OPERATIONS',
            entityId: id,
            payload: { entity, fieldKey, operatorId },
        });
    } catch (e) {
        logger.error('Failed to emit custom_field_deleted event', e as Error, { tenantId, id });
    }
}

export async function emitCustomFieldValueSet(
    tenantId: string,
    entity: CustomFieldEntity,
    entityId: string,
    fieldKey: string,
    operatorId?: string
) {
    try {
        await publishOperationalEvent({
            tenantId,
            eventType: 'custom_field_value_set',
            eventDomain: 'OPERATIONS',
            entityId,
            payload: { entity, fieldKey, operatorId },
        });
    } catch (e) {
        logger.error('Failed to emit custom_field_value_set event', e as Error, { tenantId, entityId });
    }
}
