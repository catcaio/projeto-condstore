import { BaseFilterSchema, BASE_FILTER_KEYS } from './core';

export interface FrankAssistFilterSchema extends BaseFilterSchema {
    period?: string;
    tenantId?: string;
    intent?: string;
    outcome?: string;
}

export const FRANK_ASSIST_FILTER_KEYS = [
    ...BASE_FILTER_KEYS,
    'period',
    'tenantId',
    'intent',
    'outcome',
];
