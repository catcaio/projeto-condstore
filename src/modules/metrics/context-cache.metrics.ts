import { logger } from '../../infra/logger';

export type ContextCacheMetricSource = 'redis' | 'db';
export type ContextCacheMetricReason = 'miss' | 'redis_error' | 'db_error' | 'empty';

type ContextCacheMetricEvent =
  | 'context_cache_hit'
  | 'context_cache_miss'
  | 'context_cache_db_fallback_ok'
  | 'context_cache_db_fallback_fail'
  | 'context_cache_rewarm_ok'
  | 'context_cache_rewarm_fail'
  | 'context_cache_append_ok'
  | 'context_cache_append_fail';

export interface ContextCacheMetricPayload {
  tenantId: string;
  source?: ContextCacheMetricSource;
  reason?: ContextCacheMetricReason;
}

interface ContextCacheMetricRecord extends ContextCacheMetricPayload {
  event: ContextCacheMetricEvent;
  timestamp: number;
}

function emit(event: ContextCacheMetricEvent, payload: ContextCacheMetricPayload): void {
  const metric: ContextCacheMetricRecord = {
    event,
    tenantId: payload.tenantId,
    source: payload.source,
    reason: payload.reason,
    timestamp: Date.now(),
  };

  try {
    logger.info('context-cache-metric', metric);
  } catch {
    // Fail-open: metrics must never break the request flow.
  }
}

export function trackCacheHit(payload: ContextCacheMetricPayload): void {
  emit('context_cache_hit', payload);
}

export function trackCacheMiss(payload: ContextCacheMetricPayload): void {
  emit('context_cache_miss', payload);
}

export function trackDbFallbackOk(payload: ContextCacheMetricPayload): void {
  emit('context_cache_db_fallback_ok', payload);
}

export function trackDbFallbackFail(payload: ContextCacheMetricPayload): void {
  emit('context_cache_db_fallback_fail', payload);
}

export function trackRewarmOk(payload: ContextCacheMetricPayload): void {
  emit('context_cache_rewarm_ok', payload);
}

export function trackRewarmFail(payload: ContextCacheMetricPayload): void {
  emit('context_cache_rewarm_fail', payload);
}

export function trackAppendOk(payload: ContextCacheMetricPayload): void {
  emit('context_cache_append_ok', payload);
}

export function trackAppendFail(payload: ContextCacheMetricPayload): void {
  emit('context_cache_append_fail', payload);
}
