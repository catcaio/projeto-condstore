/**
 * Declarative rate limit fallback policies for when Redis is unavailable.
 *
 * - 'fail-closed': Reject requests (return 429) when Redis is down
 * - 'fail-open': Allow requests even when Redis is down (use memory fallback)
 *
 * Default policy is 'fail-closed' for security. Explicitly list routes
 * that require 'fail-open' only when justified.
 */

export type RateLimitFallbackPolicy = 'fail-closed' | 'fail-open';

export interface RateLimitPolicyConfig {
  policy: RateLimitFallbackPolicy;
  reason?: string;
}

/**
 * Scope → Fallback Policy mapping
 * Scopes are typically "namespace:action" (e.g., "api:events", "webhook:twilio")
 */
export const RATE_LIMIT_POLICIES: Record<string, RateLimitPolicyConfig> = {
  // API Endpoints - default to fail-closed
  'api:events': { policy: 'fail-closed' },
  'api:sync-cart': { policy: 'fail-closed' },
  'api:checkout': { policy: 'fail-closed' },

  // Attribution - default to fail-closed
  'attribution:token': { policy: 'fail-closed' },
  'attribution:impression': { policy: 'fail-closed' },

  // Webhooks requiring fail-open with justification
  'webhook:twilio-signature-validated': {
    policy: 'fail-open',
    reason: 'HMAC signature already validated before rate limit check. Twilio has own rate limits.',
  },
  'webhook:conversation-inbound': {
    policy: 'fail-open',
    reason: 'UX critical: missing inbound messages is worse than rate limit bypass. Twilio has own limits.',
  },

  // Internal - default to fail-closed
  'internal:export': { policy: 'fail-closed' },
};

export function getRateLimitPolicy(scope: string): RateLimitFallbackPolicy {
  const config = RATE_LIMIT_POLICIES[scope];
  return config?.policy ?? 'fail-closed';
}
