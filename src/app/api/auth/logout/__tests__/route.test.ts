import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COOKIE_NAME } from '@/infra/auth/session';

const sessionState = vi.hoisted(() => ({
  user: {
    id: 'user-1',
    email: 'admin@example.com',
    tenantId: 'tenant-1',
    role: 'admin',
    passwordHash: 'hash',
    sessionVersion: 1,
  },
}));

const mockUserRepository = vi.hoisted(() => ({
  getUserByEmail: vi.fn(async (email: string) => {
    if (email !== sessionState.user.email) return null;
    return { ...sessionState.user };
  }),
  getUserById: vi.fn(async (id: string) => {
    if (id !== sessionState.user.id) return null;
    return { ...sessionState.user };
  }),
}));

const mockVerifyPassword = vi.hoisted(() => vi.fn(() => true));
const mockInvalidateSessions = vi.hoisted(() =>
  vi.fn(async (userId: string) => {
    if (userId === sessionState.user.id) {
      sessionState.user.sessionVersion += 1;
      return true;
    }
    return false;
  }),
);

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

vi.mock('@/infra/repositories/user.repository', () => ({
  userRepository: mockUserRepository,
}));

vi.mock('@/infra/auth/password', () => ({
  verifyPassword: mockVerifyPassword,
}));

vi.mock('@/modules/auth/invalidateSessions', () => ({
  invalidateSessions: mockInvalidateSessions,
}));

vi.mock('@/infra/security/rate-limiter', () => ({
  rateLimiter: mockRateLimiter,
  hashRateLimitKeyForLog: vi.fn(() => 'login-key-hash'),
}));

vi.mock('@/modules/audit/audit.service', () => ({
  auditService: mockAuditService,
}));

vi.mock('@/infra/logger', () => ({
  logger: mockLogger,
}));

import { POST as loginPost } from '../../login/route';
import { POST as logoutPost } from '../route';
import { GET as meGet } from '../../me/route';

function makeLoginRequest(body: unknown) {
  return {
    headers: new Headers({
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.10',
      'x-request-id': 'req-login-1',
    }),
    json: vi.fn().mockResolvedValue(body),
  } as never;
}

function makeAuthedRequest(token?: string, requestId = 'req-auth-1') {
  return {
    headers: new Headers({ 'x-request-id': requestId }),
    cookies: {
      get: vi.fn((name: string) => (name === COOKIE_NAME && token ? { name, value: token } : undefined)),
    },
    nextUrl: new URL('http://localhost/api/auth/me'),
    url: 'http://localhost/api/auth/me',
    method: 'GET',
  } as never;
}

describe('auth session invalidation on logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionState.user.sessionVersion = 1;
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('AUTH_SECRET', 'test-auth-secret');
    vi.stubEnv('DATABASE_URL', 'mysql://test:test@localhost:3306/test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('logs in, invalidates sessions on logout, and rejects the old token afterwards', async () => {
    const loginResponse = await loginPost(
      makeLoginRequest({
        email: sessionState.user.email,
        password: 'correct-password',
      }),
    );

    expect(loginResponse.status).toBe(200);
    const loginBody = await loginResponse.json();
    expect(loginBody).toMatchObject({
      success: true,
      user: { email: sessionState.user.email, role: 'admin' },
    });

    const token = loginResponse.cookies.get(COOKIE_NAME)?.value;
    expect(token).toBeTruthy();

    const beforeLogoutMe = await meGet(makeAuthedRequest(token!, 'req-me-before'));
    expect(beforeLogoutMe.status).toBe(200);

    const logoutResponse = await logoutPost(makeAuthedRequest(token!, 'req-logout-1'));
    const logoutBody = await logoutResponse.json();

    expect(logoutResponse.status).toBe(200);
    expect(logoutBody).toEqual({ success: true });
    expect(logoutResponse.headers.get('x-request-id')).toBe('req-logout-1');
    expect(logoutResponse.headers.get('set-cookie')).toContain(`${COOKIE_NAME}=;`);

    expect(mockInvalidateSessions).toHaveBeenCalledTimes(1);
    expect(mockInvalidateSessions).toHaveBeenCalledWith(sessionState.user.id);
    expect(sessionState.user.sessionVersion).toBe(2);

    const afterLogoutMe = await meGet(makeAuthedRequest(token!, 'req-me-after'));
    const afterLogoutBody = await afterLogoutMe.json();

    expect(afterLogoutMe.status).toBe(401);
    expect(afterLogoutBody).toEqual({ error: 'Unauthorized' });
  });

  it('clears cookie and returns success even when no session is present', async () => {
    const response = await logoutPost(makeAuthedRequest(undefined, 'req-logout-no-session'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(response.headers.get('x-request-id')).toBe('req-logout-no-session');
    expect(response.headers.get('set-cookie')).toContain(`${COOKIE_NAME}=;`);
    expect(mockInvalidateSessions).not.toHaveBeenCalled();
  });
});
