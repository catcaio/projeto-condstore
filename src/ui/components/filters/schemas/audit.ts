import { BaseFilterSchema, BASE_FILTER_KEYS } from './core';

export interface AuditFilterSchema extends BaseFilterSchema {
    type?: string;
    status?: string;
    actor?: string;
    resource?: string;
}

export const AUDIT_FILTER_KEYS = [...BASE_FILTER_KEYS, 'type', 'status', 'actor', 'resource'];
