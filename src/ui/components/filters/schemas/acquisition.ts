import { BaseFilterSchema, BASE_FILTER_KEYS } from './core';

export interface AcquisitionFilterSchema extends BaseFilterSchema {
    groupBy?: string;
    utm_source?: string;
    utm_campaign?: string;
}

export const ACQUISITION_FILTER_KEYS = [...BASE_FILTER_KEYS, 'groupBy', 'utm_source', 'utm_campaign'];
