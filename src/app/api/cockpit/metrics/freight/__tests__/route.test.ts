import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { getDb } from '../../../../../../infra/db';
import { getSessionUser } from '../../../../../../infra/auth/session';

const mockExecute = vi.fn();

vi.mock('../../../../../../infra/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('../../../../../../infra/auth/session', () => ({
  getSessionUser: vi.fn(),
}));

vi.mock('../../../../../../infra/redis.client', () => ({
  redisClient: {
    isAvailable: vi.fn().mockReturnValue(false),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../../../../infra/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('GET /api/cockpit/metrics/freight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({ execute: mockExecute } as never);
    vi.mocked(getSessionUser).mockResolvedValue({
      sub: 'user-1',
      email: 'user@example.com',
      tenantId: 'tenant-from-session',
      role: 'admin',
      sv: 1,
    });
  });

  it('returns metrics using tenantId from auth context and ignores arbitrary headers', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ total: '3' }], []])
      .mockResolvedValueOnce([[{ uf: 'SP', count: '2' }, { uf: 'RJ', count: '1' }], []])
      .mockResolvedValueOnce([[{ uf: 'RJ', avg_valor: '19.50' }, { uf: 'SP', avg_valor: '25.00' }], []])
      .mockResolvedValueOnce([[{ avg_peso: '2.15' }], []])
      .mockResolvedValueOnce([[{ uf: 'RJ', avg_prazo: '3.00' }, { uf: 'SP', avg_prazo: '2.00' }], []])
      .mockResolvedValueOnce([[{ date: '2026-02-01', count: '1' }, { date: '2026-02-02', count: '2' }], []]);

    const headerGet = vi.fn().mockReturnValue('spoofed-tenant');
    const request = {
      headers: { get: headerGet },
      cookies: { get: vi.fn() },
    } as never;

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      total_simulations_7d: 3,
      top_ufs_7d: [
        { uf: 'SP', count: 2 },
        { uf: 'RJ', count: 1 },
      ],
      avg_valor_by_uf_7d: [
        { uf: 'RJ', avg_valor: 19.5 },
        { uf: 'SP', avg_valor: 25 },
      ],
      avg_peso_7d: 2.15,
      avg_prazo_by_uf_7d: [
        { uf: 'RJ', avg_prazo: 3 },
        { uf: 'SP', avg_prazo: 2 },
      ],
      daily_14d: [
        { date: '2026-02-01', count: 1 },
        { date: '2026-02-02', count: 2 },
      ],
    });
    expect(mockExecute).toHaveBeenCalledTimes(6);

    expect(headerGet).toHaveBeenCalledWith('x-request-id');
    expect(headerGet).not.toHaveBeenCalledWith('x-tenant-id');
  });

  it('returns 401 when auth context has no tenantId', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const request = {
      headers: new Headers({ 'x-tenant-id': 'spoofed-tenant' }),
    } as never;

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toMatchObject({
      ok: false,
      error: { code: 'AUTH_REQUIRED' },
    });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns 403 for operator session', async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      sub: 'user-2',
      email: 'operator@example.com',
      tenantId: 'tenant-from-session',
      role: 'operator',
      sv: 1,
    });

    const request = {
      headers: new Headers(),
    } as never;

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(response.headers.get('x-request-id')).toBeTruthy();
    expect(data).toMatchObject({
      ok: false,
      error: { code: 'FORBIDDEN' },
    });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns attribution breakdown when groupBy=utm_source', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ total: '2' }], []])
      .mockResolvedValueOnce([[{ uf: 'SP', count: '2' }], []])
      .mockResolvedValueOnce([[{ uf: 'SP', avg_valor: '25.00' }], []])
      .mockResolvedValueOnce([[{ avg_peso: '2.15' }], []])
      .mockResolvedValueOnce([[{ uf: 'SP', avg_prazo: '2.00' }], []])
      .mockResolvedValueOnce([[{ date: '2026-02-01', count: '2' }], []])
      .mockResolvedValueOnce([[{ bucket: 'google', count: '5' }, { bucket: '(none)', count: '2' }], []]);

    const request = {
      nextUrl: new URL('http://localhost/api/cockpit/metrics/freight?groupBy=utm_source'),
      headers: { get: vi.fn() },
      cookies: { get: vi.fn() },
    } as never;

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.attribution_breakdown_7d).toEqual({
      groupBy: 'utm_source',
      buckets: [
        { key: 'google', count: 5 },
        { key: '(none)', count: 2 },
      ],
    });
  });
});
