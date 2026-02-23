interface RateLimitState {
  count: number;
  windowStart: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterMs?: number;
}

const WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 30;
const store = new Map<string, RateLimitState>();

function getLimit(): number {
  const raw = process.env.AI_TENANT_RATE_LIMIT;
  if (!raw) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LIMIT;
}

export function checkTenantRateLimit(tenantId: string): RateLimitResult {
  const now = Date.now();
  const limit = getLimit();
  const state = store.get(tenantId);

  if (!state || now - state.windowStart >= WINDOW_MS) {
    store.set(tenantId, { count: 1, windowStart: now });
    return { allowed: true, remaining: Math.max(0, limit - 1), limit };
  }

  state.count += 1;
  store.set(tenantId, state);

  if (state.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      limit,
      retryAfterMs: WINDOW_MS - (now - state.windowStart),
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - state.count),
    limit,
  };
}
