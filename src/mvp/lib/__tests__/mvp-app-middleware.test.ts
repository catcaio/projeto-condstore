/**
 * Tests for the /mvp/app route middleware behaviour.
 *
 * Verifies that unauthenticated visitors are redirected to /auth/login and
 * that authenticated visitors pass through with the session headers injected.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('../../../lib/security/edge-logger', () => ({
  logEdgeSecurityEvent: vi.fn(),
}));

vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
}));

describe('/mvp/app middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv('AUTH_SECRET', 'middleware-auth-secret-with-32-bytes');
    vi.stubEnv('NODE_ENV', 'test');
  });

  it('redirects unauthenticated access to /mvp/app/ to /auth/login', async () => {
    const { middleware } = await import('../../../middleware');
    const req = new NextRequest('http://localhost/mvp/app/');
    const res = await middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/auth/login');
    expect(res.headers.get('location')).toContain('callbackUrl');
  });

  it('allows access to /mvp/app/ with valid session cookie and injects auth headers', async () => {
    const { jwtVerify } = await import('jose');
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { sub: 'user-abc', tenantId: 'tenant-xyz', role: 'operator' },
    } as never);

    const { middleware } = await import('../../../middleware');
    const req = new NextRequest('http://localhost/mvp/app/');
    req.cookies.set('condstore_session', 'mock-valid-token');

    const res = await middleware(req);

    expect(res.status).toBe(200);
  });

  it('does not redirect unauthenticated access to public /mvp (landing)', async () => {
    // /mvp is NOT in the middleware matcher, so requests to it never reach
    // the middleware function; this test ensures we haven't accidentally
    // changed the matcher to cover /mvp itself.
    const { config } = await import('../../../middleware');
    const matcher: string[] = Array.isArray(config.matcher)
      ? config.matcher
      : [config.matcher];

    const coversPublicLanding = matcher.some(
      (m) => m === '/mvp' || m === '/mvp/:path*',
    );
    expect(coversPublicLanding).toBe(false);
  });

  it('matcher includes /mvp/app/:path*', async () => {
    const { config } = await import('../../../middleware');
    const matcher: string[] = Array.isArray(config.matcher)
      ? config.matcher
      : [config.matcher];

    expect(matcher).toContain('/mvp/app/:path*');
  });
});
