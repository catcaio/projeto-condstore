import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPassword } from '@/infra/auth/password';
import { COOKIE_NAME } from '@/infra/auth/session';
import { getInternalExportTokenOrThrow, isInternalTokenAuthorized } from '@/infra/config/internal-token';

const authState = vi.hoisted(() => ({
  user: {
    id: 'user-1',
    email: 'admin@condstore.local',
    tenantId: 'tenant-1',
    role: 'admin' as const,
    passwordHash: '',
    sessionVersion: 1,
  },
}));

const mockUserRepository = vi.hoisted(() => ({
  getUserByEmail: vi.fn(async (email: string) => {
    if (email.trim().toLowerCase() !== authState.user.email) return null;
    return { ...authState.user };
  }),
  updatePasswordHashAndBumpSessionVersion: vi.fn(async (userId: string, newHash: string) => {
    if (userId !== authState.user.id) return false;
    authState.user.passwordHash = newHash;
    authState.user.sessionVersion += 1;
    return true;
  }),
}));

const mockRateLimiter = vi.hoisted(() => ({
  limit: vi.fn(async () => ({
    allowed: true,
    remaining: 4,
    resetAt: Date.now() + 60_000,
    limit: 5,
  })),
}));

const mockAuditService = vi.hoisted(() => ({
  logEvent: vi.fn(async () => undefined),
}));

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

const mockStructuredLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

vi.mock('@/infra/config/internal-token', () => ({
  getInternalExportTokenOrThrow: vi.fn(),
  isInternalTokenAuthorized: vi.fn(),
}));

vi.mock('@/infra/repositories/user.repository', () => ({
  userRepository: mockUserRepository,
}));

vi.mock('@/infra/security/rate-limiter', () => ({
  rateLimiter: mockRateLimiter,
  hashRateLimitKeyForLog: vi.fn(() => 'hashed-login-key'),
}));

vi.mock('@/modules/audit/audit.service', () => ({
  auditService: mockAuditService,
}));

vi.mock('@/infra/logger', () => ({
  logger: mockLogger,
}));

vi.mock('@/infra/log/logger', () => ({
  structuredLogger: mockStructuredLogger,
}));

import { POST as resetAdminPost } from '../route';
import { POST as loginPost } from '../../../../auth/login/route';

function makeResetRequest(body: unknown, token?: string): Request {
  return new Request('http://localhost/api/internal/auth/reset-admin', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { 'x-internal-token': token } : {}),
      'x-request-id': 'req-reset-admin',
    },
    body: JSON.stringify(body),
  });
}

function makeLoginRequest(body: unknown): Request {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.25',
      'x-request-id': 'req-login-after-reset',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/internal/auth/reset-admin', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalVercelEnv = process.env.VERCEL_ENV;
  const originalAuthSecret = process.env.AUTH_SECRET;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    authState.user.passwordHash = hashPassword('OldPassword!123');
    authState.user.sessionVersion = 1;

    process.env.NODE_ENV = 'test';
    process.env.VERCEL_ENV = 'preview';
    process.env.AUTH_SECRET = 'test-auth-secret';
    process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test';

    vi.mocked(getInternalExportTokenOrThrow).mockReturnValue('internal-test-token');
    vi.mocked(isInternalTokenAuthorized).mockReturnValue(true);
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;

    if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalVercelEnv;

    if (originalAuthSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = originalAuthSecret;

    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('returns 401 when internal token is missing/invalid', async () => {
    vi.mocked(isInternalTokenAuthorized).mockReturnValue(false);

    const response = await resetAdminPost(
      makeResetRequest({ email: authState.user.email, newPassword: 'Condstore@123' }) as never,
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get('x-request-id')).toBeTruthy();
    expect(body).toMatchObject({
      ok: false,
      error: { code: 'AUTH_REQUIRED' },
    });
  });

  it('resets admin password and login succeeds with the new password', async () => {
    const resetResponse = await resetAdminPost(
      makeResetRequest(
        { email: authState.user.email, newPassword: 'Condstore@123' },
        'internal-test-token',
      ) as never,
    );
    const resetBody = await resetResponse.json();

    expect(resetResponse.status).toBe(200);
    expect(resetResponse.headers.get('x-request-id')).toBe('req-reset-admin');
    expect(resetBody).toEqual({ ok: true });
    expect(authState.user.sessionVersion).toBe(2);
    expect(vi.mocked(mockUserRepository.updatePasswordHashAndBumpSessionVersion)).toHaveBeenCalledTimes(1);

    const loginResponse = await loginPost(
      makeLoginRequest({
        email: authState.user.email,
        password: 'Condstore@123',
      }) as never,
    );
    const loginBody = await loginResponse.json();

    expect(loginResponse.status).toBe(200);
    expect(loginBody).toMatchObject({
      success: true,
      user: {
        email: authState.user.email,
        role: 'admin',
      },
    });
    expect(loginResponse.cookies.get(COOKIE_NAME)?.value).toBeTruthy();
  });
});
