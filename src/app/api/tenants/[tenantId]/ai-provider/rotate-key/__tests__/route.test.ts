import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../route';
import { getSessionUser } from '../../../../../../../infra/auth/session';
import { checkRedisRateLimit } from '../../../../../../../infra/rate-limit/redis-rate-limiter';
import { tenantAiProviderRepository } from '../../../../../../../infra/repositories/tenant-ai-provider.repository';

vi.mock('../../../../../../../infra/auth/session', () => ({
  getSessionUser: vi.fn(),
}));

vi.mock('../../../../../../../infra/rate-limit/redis-rate-limiter', () => ({
  checkRedisRateLimit: vi.fn(),
}));

vi.mock('../../../../../../../infra/repositories/tenant-ai-provider.repository', () => ({
  tenantAiProviderRepository: {
    rotateApiKey: vi.fn(),
  },
}));

function makeRequest(pathname: string, options?: { body?: unknown; cookie?: string }) {
  return {
    nextUrl: new URL(`http://localhost${pathname}`),
    headers: new Headers(options?.cookie ? { cookie: options.cookie } : undefined),
    cookies: { get: vi.fn() },
    json: vi.fn().mockResolvedValue(options?.body ?? {}),
  } as never;
}

describe('/api/tenants/[tenantId]/ai-provider/rotate-key RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(checkRedisRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetAt: Date.now() + 60_000,
    });

    vi.mocked(getSessionUser).mockResolvedValue({
      sub: 'user-1',
      email: 'admin@example.com',
      tenantId: 'tenant-1',
      role: 'admin',
      sv: 1,
    });
  });

  it('returns 401 when request has no valid session cookie', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const response = await POST(
      makeRequest('/api/tenants/tenant-1/ai-provider/rotate-key', {
        body: { apiKey: 'secret' },
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'UNAUTHORIZED' });
    expect(checkRedisRateLimit).not.toHaveBeenCalled();
  });

  it('returns 403 for operator role', async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      sub: 'user-2',
      email: 'operator@example.com',
      tenantId: 'tenant-1',
      role: 'operator',
      sv: 1,
    });

    const response = await POST(
      makeRequest('/api/tenants/tenant-1/ai-provider/rotate-key', {
        cookie: 'condstore_session=x',
        body: { apiKey: 'secret' },
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'FORBIDDEN' });
    expect(checkRedisRateLimit).not.toHaveBeenCalled();
    expect(tenantAiProviderRepository.rotateApiKey).not.toHaveBeenCalled();
  });

  it('returns 200 for admin role', async () => {
    vi.mocked(tenantAiProviderRepository.rotateApiKey).mockResolvedValue(undefined);

    const response = await POST(
      makeRequest('/api/tenants/tenant-1/ai-provider/rotate-key', {
        cookie: 'condstore_session=x',
        body: { apiKey: 'secret' },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ tenantId: 'tenant-1', rotated: true });
    expect(checkRedisRateLimit).toHaveBeenCalledTimes(1);
    expect(tenantAiProviderRepository.rotateApiKey).toHaveBeenCalledWith('tenant-1', 'secret');
  });
});
