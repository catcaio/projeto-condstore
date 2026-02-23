import { logger } from '../../infra/logger';

export type MetricSource = 'redis' | 'db';
export type MetricReason = 'hit' | 'miss' | 'redis_error' | 'db_error' | 'empty';

export interface MetricTags {
    tenantId: string;
    limit: number;
    source: MetricSource;
    reason: MetricReason;
}

class Metrics {
    increment(metric: string, tags: MetricTags): void {
        logger.info('metric:increment', { metric, ...tags });
    }
}

export const metrics = new Metrics();
