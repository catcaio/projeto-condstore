import { getDb } from '../../infra/db';
import { publicEvents } from '../../drizzle/schema';
import crypto from 'crypto';
import type { AttributionSnapshot } from '../../infra/attribution/attribution.types';
import { structuredLogger } from '../../infra/log/logger';

interface LogPublicEventParams {
  tenantId: string;
  anonId: string;
  event: string;
  path: string;
  props?: Record<string, unknown> | null;
  userAgent?: string;
  attribution?: AttributionSnapshot | null;
}

/**
 * Determine if an error is retryable (transient) or permanent
 */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return true; // Unknown errors are retryable

  const message = error.message.toLowerCase();

  // Permanent errors that should not retry
  const nonRetryable = ['tenant_id is required', 'validation failed', 'constraint violation', 'foreign key', 'unique constraint'];

  if (nonRetryable.some(msg => message.includes(msg))) {
    return false;
  }

  return true; // Default to retryable (timeouts, connection errors, etc.)
}

/**
 * Sleep with jitter for exponential backoff
 */
function sleepWithJitter(delayMs: number): Promise<void> {
  // Add up to 20% jitter
  const jitter = delayMs * (0.1 + Math.random() * 0.1);
  const actualDelay = Math.floor(delayMs + jitter);
  return new Promise(resolve => setTimeout(resolve, actualDelay));
}

export const analyticsService = {
  /**
   * Logs a public conversion event resiliently with retry logic.
   * Automatically retries transient errors (connection, timeout) once.
   * Permanent errors (validation, constraints) fail fast without retry.
   * Any failure inside this function will be gracefully caught and logged
   * without rejecting the Promise. This prevents the tracking logic from
   * breaking the main business flows.
   */
  async logEvent(params: LogPublicEventParams): Promise<void> {
    const eventId = crypto.randomUUID();
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const tenantId = params.tenantId?.trim();
        if (!tenantId) {
          throw new Error('tenant_id is required to log public event');
        }

        const db = await getDb();

        const safeProps =
          params.props && Object.keys(params.props).length > 0
            ? JSON.stringify(params.props)
            : null;

        await db.insert(publicEvents).values({
          id: eventId,
          tenantId,
          anonId: params.anonId,
          event: params.event,
          path: params.path,
          props: safeProps,
          userAgent: params.userAgent ?? null,
          utmSource: params.attribution?.utmSource ?? null,
          utmMedium: params.attribution?.utmMedium ?? null,
          utmCampaign: params.attribution?.utmCampaign ?? null,
          utmTerm: params.attribution?.utmTerm ?? null,
          utmContent: params.attribution?.utmContent ?? null,
          refToken: params.attribution?.refToken ?? null,
          clickId: params.attribution?.clickId ?? null,
        });

        // Success
        if (attempt > 1) {
          structuredLogger.info('analytics_log_event_retry_success', {
            eventType: 'analytics',
            eventId,
            attempt,
          });
        }
        return;
      } catch (err) {
        const isRetryable = isRetryableError(err);
        const isLastAttempt = attempt === maxAttempts;
        const delayMs = attempt === 1 ? 50 : 200;

        if (isRetryable && !isLastAttempt) {
          // Log retry and wait before next attempt
          structuredLogger.warn('analytics_log_event_retrying', {
            eventType: 'analytics',
            eventId,
            attempt,
            error: err instanceof Error ? err.message : String(err),
          });
          await sleepWithJitter(delayMs);
          continue; // Try again
        }

        // Not retryable or last attempt - log and drop event
        structuredLogger.error('analytics_log_event_dropped', {
          eventType: 'analytics',
          eventId,
          attempt,
          attempts_total: maxAttempts,
          error: err instanceof Error ? err.message : String(err),
          isRetryable,
        });
        return; // Don't throw - fail gracefully
      }
    }
  },
};
