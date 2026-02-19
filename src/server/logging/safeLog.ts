/**
 * Safe logging utilities for webhook handlers.
 *
 * Provides helpers to build log contexts that never include PII such as
 * phone numbers (From, To, WaId), message bodies (Body), display names
 * (ProfileName), or raw form parameters.
 *
 * Detailed/debug context is only emitted when running in development or when
 * LOG_LEVEL=debug is explicitly set.
 */

/** Returns true if debug-level logging is permitted in the current environment. */
export function isDebugEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.LOG_LEVEL === 'debug'
  );
}

/** Safe fields allowed in webhook log contexts. */
export interface SafeWebhookContext {
  messageSid?: string;
  tenantId?: string;
  intent?: string;
  hasBody?: boolean;
  bodyLength?: number;
  durationMs?: number;
  event?: string;
  [key: string]: unknown;
}

/**
 * Build a log context object with only safe, non-PII fields.
 *
 * Deliberately excluded: From, To, WaId, Body, ProfileName,
 * raw phone numbers, and any message content.
 */
export function safeWebhookContext(opts: SafeWebhookContext): Record<string, unknown> {
  const ctx: Record<string, unknown> = {};

  if (opts.messageSid !== undefined) ctx.messageSid = opts.messageSid;
  if (opts.tenantId  !== undefined) ctx.tenantId  = opts.tenantId;
  if (opts.intent    !== undefined) ctx.intent    = opts.intent;
  if (opts.hasBody   !== undefined) ctx.hasBody   = opts.hasBody;
  if (opts.bodyLength !== undefined) ctx.bodyLength = opts.bodyLength;
  if (opts.durationMs !== undefined) ctx.durationMs = opts.durationMs;
  if (opts.event     !== undefined) ctx.event     = opts.event;

  return ctx;
}
