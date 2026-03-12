import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import { logger } from '@/infra/logger';
import { ConfigCategory } from './config.types';

export async function emitConfigCreated(
    tenantId: string,
    key: string,
    category: ConfigCategory,
    createdBy: string | undefined
) {
    try {
        await publishOperationalEvent({
            tenantId,
            eventType: 'config_created',
            eventDomain: 'OPERATIONS',
            entityId: key,
            payload: { key, category, createdBy },
        });
    } catch (e) {
        logger.error('Failed to emit config_created event', e as Error, { tenantId, key });
    }
}

export async function emitConfigUpdated(
    tenantId: string,
    key: string,
    category: ConfigCategory,
    createdBy: string | undefined
) {
    try {
        await publishOperationalEvent({
            tenantId,
            eventType: 'config_updated',
            eventDomain: 'OPERATIONS',
            entityId: key,
            payload: { key, category, createdBy },
        });
    } catch (e) {
        logger.error('Failed to emit config_updated event', e as Error, { tenantId, key });
    }
}

export async function emitConfigDeleted(
    tenantId: string,
    key: string,
    category: ConfigCategory,
    createdBy: string | undefined
) {
    try {
        await publishOperationalEvent({
            tenantId,
            eventType: 'config_deleted',
            eventDomain: 'OPERATIONS',
            entityId: key,
            payload: { key, category, createdBy },
        });
    } catch (e) {
        logger.error('Failed to emit config_deleted event', e as Error, { tenantId, key });
    }
}
