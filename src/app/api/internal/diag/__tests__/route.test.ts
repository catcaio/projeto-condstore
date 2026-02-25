import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../route';
import { getDb } from '../../../../../infra/db';
import { redisClient } from '../../../../../infra/redis.client';
import { getInternalExportTokenOrThrow, isInternalTokenAuthorized } from '../../../../../infra/config/internal-token';

vi.mock('../../../../../infra/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('../../../../../infra/redis.client', () => ({
  redisClient: {
    ping: vi.fn(),
  },
}));

vi.mock('../../../../../infra/config/internal-token', () => ({
  getInternalExportTokenOrThrow: vi.fn(),
  isInternalTokenAuthorized: vi.fn(),
}));

function makeRequest(headers?: Record<string, string>) {
  return {
    headers: new Headers(headers),
  } as never;
}

describe('GET /api/internal/diag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getInternalExportTokenOrThrow).mockReturnValue('internal-test-token');
    vi.mocked(isInternalTokenAuthorized).mockReturnValue(true);
    vi.mocked(redisClient.ping).mockResolvedValue(true as never);
    vi.mocked(getDb).mockResolvedValue({
      execute: vi.fn().mockResolvedValue(undefined),
    } as never);
  });

  it('requires internal token', async () => {
    vi.mocked(isInternalTokenAuthorized).mockReturnValue(false);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get('x-request-id')).toBeTruthy();
    expect(body).toMatchObject({
      ok: false,
      error: {
        code: 'AUTH_REQUIRED',
      },
    });
  });

  it('returns diagnostic status when authorized', async () => {
    const response = await GET(makeRequest({ 'x-internal-token': 'internal-test-token' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBeTruthy();
    expect(body).toMatchObject({
      env: expect.any(String),
      db: 'ok',
      redis: 'ok',
      version: expect.any(String),
    });
    expect(typeof body.uptimeSeconds).toBe('number');
  });
});

