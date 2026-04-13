import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockRateLimiter = vi.hoisted(() => ({
  limit: vi.fn(),
}));

const mockStructuredLogger = vi.hoisted(() => ({
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

const mockSha256Hex = vi.hoisted(() =>
  vi.fn((input: string | null | undefined) => (input ? '0123456789abcdef0123456789abcdef' : null)),
);

vi.mock('../rate-limiter', () => ({
  rateLimiter: mockRateLimiter,
  hashRateLimitKeyForLog: vi.fn((key: string) => `hash:${key.slice(0, 8)}`),
  applyRateLimitHeaders: vi.fn(),
}));

vi.mock('../../log/logger', () => ({
  structuredLogger: mockStructuredLogger,
}));

vi.mock('../../attribution/hash', () => ({
  sha256Hex: mockSha256Hex,
}));

vi.mock('../../http/error-response', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../http/error-response')>();
  return {
    ...actual,
    errorResponse: vi.fn((_code: string, status: number, requestId: string) => {
      const headers = new Map<string, string>();
      return {
        status,
        headers: {
          set: (k: string, v: string) => headers.set(k, v),
          get: (k: string) => headers.get(k),
          _map: headers,
        },
        __requestId: requestId,
      } as any;
    }),
  };
});

import {
  applyFrankCockpitRateLimit,
  applyFrankInternalRateLimit,
  applyFrankSchedulerRateLimit,
} from '../frank-rate-limit';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function allowedDecision(max = 60) {
  return { allowed: true, remaining: max - 1, resetAt: Date.now() + 60_000, limit: max };
}

function blockedDecision(resetAt = Date.now() + 30_000, max = 60) {
  return { allowed: false, remaining: 0, resetAt, limit: max };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('applyFrankCockpitRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimiter.limit.mockResolvedValue(allowedDecision());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows request when below tenant limit', async () => {
    const result = await applyFrankCockpitRateLimit({
      tenantId: 'tenant-a',
      requestId: 'req-1',
      route: '/api/cockpit/frank/suggestions',
    });

    expect(result.blocked).toBe(false);
    expect(mockRateLimiter.limit).toHaveBeenCalledWith(
      'frank_cockpit_tenant',
      'tenant:tenant-a',
      { windowSec: 60, max: 60 },
    );
  });

  it('blocks request and returns 429 when tenant limit exceeded', async () => {
    mockRateLimiter.limit.mockResolvedValue(blockedDecision());

    const result = await applyFrankCockpitRateLimit({
      tenantId: 'tenant-a',
      requestId: 'req-1',
      route: '/api/cockpit/frank/suggestions',
    });

    expect(result.blocked).toBe(true);
    if (!result.blocked) throw new Error('Expected blocked');
    expect(result.response.status).toBe(429);
    expect(mockStructuredLogger.warn).toHaveBeenCalledWith(
      'frank_rate_limited',
      expect.objectContaining({
        tenantId: 'tenant-a',
        reason: 'tenant_limit_exceeded',
        requestId: 'req-1',
      }),
    );
  });

  it('sets Retry-After header on 429 response', async () => {
    const resetAt = Date.now() + 45_000;
    mockRateLimiter.limit.mockResolvedValue(blockedDecision(resetAt));

    const result = await applyFrankCockpitRateLimit({
      tenantId: 'tenant-a',
      requestId: 'req-1',
      route: '/api/cockpit/frank/suggestions',
    });

    expect(result.blocked).toBe(true);
    if (!result.blocked) throw new Error('Expected blocked');
    const retryAfter = Number(result.response.headers.get('Retry-After'));
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(45);
  });

  it('checks conversation-level limit when conversationId is provided', async () => {
    // tenant allowed, then conversation allowed
    mockRateLimiter.limit
      .mockResolvedValueOnce(allowedDecision(60))   // tenant
      .mockResolvedValueOnce(allowedDecision(10));  // conversation

    const result = await applyFrankCockpitRateLimit({
      tenantId: 'tenant-a',
      conversationId: 'conv-123',
      requestId: 'req-1',
      route: '/api/cockpit/frank/suggestions',
    });

    expect(result.blocked).toBe(false);
    expect(mockRateLimiter.limit).toHaveBeenCalledTimes(2);
    expect(mockRateLimiter.limit).toHaveBeenCalledWith(
      'frank_cockpit_conversation',
      'tenant:tenant-a:conversation:conv-123',
      { windowSec: 60, max: 10 },
    );
  });

  it('blocks and returns 429 when conversation limit exceeded', async () => {
    mockRateLimiter.limit
      .mockResolvedValueOnce(allowedDecision(60))    // tenant passes
      .mockResolvedValueOnce(blockedDecision());     // conversation blocked

    const result = await applyFrankCockpitRateLimit({
      tenantId: 'tenant-a',
      conversationId: 'conv-123',
      requestId: 'req-2',
      route: '/api/cockpit/frank/suggestions',
    });

    expect(result.blocked).toBe(true);
    if (!result.blocked) throw new Error('Expected blocked');
    expect(result.response.status).toBe(429);
    expect(mockStructuredLogger.warn).toHaveBeenCalledWith(
      'frank_rate_limited',
      expect.objectContaining({
        reason: 'conversation_limit_exceeded',
        tenantId: 'tenant-a',
      }),
    );
  });

  it('does NOT check conversation limit when no conversationId', async () => {
    const result = await applyFrankCockpitRateLimit({
      tenantId: 'tenant-a',
      requestId: 'req-1',
      route: '/api/cockpit/frank/feed',
    });

    expect(result.blocked).toBe(false);
    expect(mockRateLimiter.limit).toHaveBeenCalledTimes(1); // only tenant check
  });

  it('isolates tenants — different tenants use different keys', async () => {
    mockRateLimiter.limit.mockResolvedValue(allowedDecision());

    await applyFrankCockpitRateLimit({ tenantId: 'tenant-a', requestId: 'r1', route: '/test' });
    await applyFrankCockpitRateLimit({ tenantId: 'tenant-b', requestId: 'r2', route: '/test' });

    const calls = mockRateLimiter.limit.mock.calls;
    const keys = calls.map((c) => c[1] as string);
    expect(keys[0]).toBe('tenant:tenant-a');
    expect(keys[1]).toBe('tenant:tenant-b');
    expect(keys[0]).not.toBe(keys[1]);
  });

  it('isolates conversations — different convIds use different keys', async () => {
    mockRateLimiter.limit.mockResolvedValue(allowedDecision());

    await applyFrankCockpitRateLimit({ tenantId: 'tenant-a', conversationId: 'conv-1', requestId: 'r1', route: '/test' });
    await applyFrankCockpitRateLimit({ tenantId: 'tenant-a', conversationId: 'conv-2', requestId: 'r2', route: '/test' });

    const convCalls = mockRateLimiter.limit.mock.calls.filter((c) => (c[0] as string) === 'frank_cockpit_conversation');
    expect(convCalls[0]?.[1]).toBe('tenant:tenant-a:conversation:conv-1');
    expect(convCalls[1]?.[1]).toBe('tenant:tenant-a:conversation:conv-2');
    expect(convCalls[0]?.[1]).not.toBe(convCalls[1]?.[1]);
  });

  it('short-circuits on tenant block without checking conversation', async () => {
    mockRateLimiter.limit.mockResolvedValue(blockedDecision());

    await applyFrankCockpitRateLimit({
      tenantId: 'tenant-a',
      conversationId: 'conv-123',
      requestId: 'req-1',
      route: '/test',
    });

    // Only one call — conversation check must not happen after tenant block
    expect(mockRateLimiter.limit).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('applyFrankInternalRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimiter.limit.mockResolvedValue(allowedDecision());
  });

  it('allows request when below tenant limit', async () => {
    const result = await applyFrankInternalRateLimit({
      tenantId: 'tenant-x',
      requestId: 'req-1',
      route: '/api/internal/frank/gate',
    });

    expect(result.blocked).toBe(false);
    expect(mockRateLimiter.limit).toHaveBeenCalledWith(
      'frank_internal_tenant',
      'tenant:tenant-x',
      { windowSec: 60, max: 60 },
    );
  });

  it('blocks and returns 429 when tenant limit exceeded', async () => {
    mockRateLimiter.limit.mockResolvedValue(blockedDecision());

    const result = await applyFrankInternalRateLimit({
      tenantId: 'tenant-x',
      requestId: 'req-1',
      route: '/api/internal/frank/gate',
    });

    expect(result.blocked).toBe(true);
    if (!result.blocked) throw new Error('Expected blocked');
    expect(result.response.status).toBe(429);
    expect(mockStructuredLogger.warn).toHaveBeenCalledWith(
      'frank_internal_rate_limited',
      expect.objectContaining({ tenantId: 'tenant-x', reason: 'tenant_limit_exceeded' }),
    );
  });

  it('isolates tenants — different tenants are independent', async () => {
    mockRateLimiter.limit.mockResolvedValue(allowedDecision());

    await applyFrankInternalRateLimit({ tenantId: 'tenant-a', requestId: 'r1', route: '/test' });
    await applyFrankInternalRateLimit({ tenantId: 'tenant-b', requestId: 'r2', route: '/test' });

    const keys = mockRateLimiter.limit.mock.calls.map((c) => c[1] as string);
    expect(keys[0]).toBe('tenant:tenant-a');
    expect(keys[1]).toBe('tenant:tenant-b');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('applyFrankSchedulerRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimiter.limit.mockResolvedValue(allowedDecision(10));
  });

  it('allows when below global scheduler limit', async () => {
    const result = await applyFrankSchedulerRateLimit({
      requestId: 'req-1',
      route: '/api/internal/frank/scheduler/run',
    });

    expect(result.blocked).toBe(false);
    expect(mockRateLimiter.limit).toHaveBeenCalledWith(
      'frank_internal_scheduler',
      'global:frank_scheduler',
      { windowSec: 60, max: 10 },
    );
  });

  it('blocks and returns 429 when global scheduler limit exceeded', async () => {
    mockRateLimiter.limit.mockResolvedValue(blockedDecision());

    const result = await applyFrankSchedulerRateLimit({
      requestId: 'req-1',
      route: '/api/internal/frank/scheduler/run',
    });

    expect(result.blocked).toBe(true);
    if (!result.blocked) throw new Error('Expected blocked');
    expect(result.response.status).toBe(429);
    expect(mockStructuredLogger.warn).toHaveBeenCalledWith(
      'frank_internal_rate_limited',
      expect.objectContaining({ reason: 'scheduler_limit_exceeded' }),
    );
  });
});
