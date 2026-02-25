import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, PUT } from '../route';
import { getSessionUser } from '../../../../../../infra/auth/session';
import { checkRedisRateLimit } from '../../../../../../infra/rate-limit/redis-rate-limiter';
import { tenantAiProviderRepository } from '../../../../../../infra/repositories/tenant-ai-provider.repository';

vi.mock('../../../../../../infra/auth/session', () => ({
  getSessionUser: vi.fn(),
}));

vi.mock('../../../../../../infra/rate-limit/redis-rate-limiter', () => ({
  checkRedisRateLimit: vi.fn(),
}));

vi.mock('../../../../../../infra/repositories/tenant-ai-provider.repository', () => ({
  tenantAiProviderRepository: {
    getProviderConfig: vi.fn(),
    upsertProviderConfig: vi.fn(),
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

describe('/api/tenants/[tenantId]/ai-provider RBAC', () => {
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

    const response = await GET(makeRequest('/api/tenants/tenant-1/ai-provider'));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'UNAUTHORIZED' });
    expect(checkRedisRateLimit).not.toHaveBeenCalled();
  });

  it('returns 403 for operator role on GET', async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      sub: 'user-2',
      email: 'operator@example.com',
      tenantId: 'tenant-1',
      role: 'operator',
      sv: 1,
    });

    const response = await GET(makeRequest('/api/tenants/tenant-1/ai-provider', { cookie: 'condstore_session=x' }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'FORBIDDEN' });
    expect(checkRedisRateLimit).not.toHaveBeenCalled();
    expect(tenantAiProviderRepository.getProviderConfig).not.toHaveBeenCalled();
  });

  it('returns 200 for admin role on GET', async () => {
    vi.mocked(tenantAiProviderRepository.getProviderConfig).mockResolvedValue({
      id: 'cfg-1',
      tenantId: 'tenant-1',
      providerType: 'shared',
      baseUrl: 'https://api.example.com',
      model: 'gpt',
      embedModel: 'embed',
      apiKeyEncrypted: 'v1:enc',
      isEnabled: 1,
      timeoutMs: 20000,
      createdAt: new Date('2026-02-01T00:00:00Z'),
      updatedAt: new Date('2026-02-01T00:00:00Z'),
      resolvedApiKey: 'secret',
    } as never);

    const response = await GET(makeRequest('/api/tenants/tenant-1/ai-provider', { cookie: 'condstore_session=x' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      tenantId: 'tenant-1',
      configured: true,
      hasApiKey: true,
    });
    expect(checkRedisRateLimit).toHaveBeenCalledTimes(1);
    expect(tenantAiProviderRepository.getProviderConfig).toHaveBeenCalledWith('tenant-1');
  });

  it('returns 403 for operator role on PUT', async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      sub: 'user-2',
      email: 'operator@example.com',
      tenantId: 'tenant-1',
      role: 'operator',
      sv: 1,
    });

    const response = await PUT(
      makeRequest('/api/tenants/tenant-1/ai-provider', {
        cookie: 'condstore_session=x',
        body: {
          providerType: 'shared',
          baseUrl: 'https://api.example.com',
          model: 'gpt',
          embedModel: 'embed',
        },
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'FORBIDDEN' });
    expect(checkRedisRateLimit).not.toHaveBeenCalled();
    expect(tenantAiProviderRepository.upsertProviderConfig).not.toHaveBeenCalled();
  });

  it('returns 200 for admin role on PUT', async () => {
    vi.mocked(tenantAiProviderRepository.upsertProviderConfig).mockResolvedValue(undefined);

    const response = await PUT(
      makeRequest('/api/tenants/tenant-1/ai-provider', {
        cookie: 'condstore_session=x',
        body: {
          providerType: 'shared',
          baseUrl: 'https://api.example.com',
          model: 'gpt',
          embedModel: 'embed',
          isEnabled: true,
        },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ tenantId: 'tenant-1', updated: true });
    expect(checkRedisRateLimit).toHaveBeenCalledTimes(1);
    expect(tenantAiProviderRepository.upsertProviderConfig).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({
        providerType: 'shared',
        baseUrl: 'https://api.example.com',
        model: 'gpt',
        embedModel: 'embed',
      }),
    );
  });
});
