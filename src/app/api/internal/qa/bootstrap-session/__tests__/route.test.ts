/**
 * Regression tests for QA session bootstrap lockdown.
 *
 * Verifies that the route returns 403 without Set-Cookie in Production
 * and Preview environments, even when QA_BOOTSTRAP_TOKEN is valid.
 *
 * These tests cover the P0 security finding: an attacker holding a valid
 * QA_BOOTSTRAP_TOKEN must NOT be able to mint an arbitrary session in Production.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Fake test-only token — NOT a real secret, safe to commit.
// ---------------------------------------------------------------------------
const FAKE_QA_TOKEN = 'test-only-qa-token-000000000000000000';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBootstrapRequest(headers: Record<string, string> = {}, body: object = {}) {
  return new NextRequest('http://localhost/api/internal/qa/bootstrap-session', {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json', ...headers }),
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown — save & restore env to avoid cross-test contamination
// ---------------------------------------------------------------------------

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = {
    VERCEL_ENV: process.env.VERCEL_ENV,
    NODE_ENV: process.env.NODE_ENV,
    APP_ENV: process.env.APP_ENV,
    QA_BOOTSTRAP_TOKEN: process.env.QA_BOOTSTRAP_TOKEN,
    AUTH_SECRET: process.env.AUTH_SECRET,
  };

  // Provide a valid QA token so token-auth passes — the route-level env guard
  // must fire BEFORE token validation reaches cookie emission.
  process.env.QA_BOOTSTRAP_TOKEN = FAKE_QA_TOKEN;
  process.env.AUTH_SECRET = 'test-auth-secret-minimum-32-chars-!!';
});

afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  vi.resetModules();
});

// ---------------------------------------------------------------------------
// P0 — Production lockdown
// ---------------------------------------------------------------------------

describe('QA Bootstrap — Production lockdown (P0)', () => {
  it('returns 403 with no Set-Cookie when VERCEL_ENV=production and token is valid', async () => {
    process.env.VERCEL_ENV = 'production';
    delete process.env.NODE_ENV; // remove NODE_ENV so only VERCEL_ENV signals env

    // Dynamic import so env changes are visible to module initialisation.
    const { POST } = await import('../route');

    const req = makeBootstrapRequest(
      { 'x-qa-token': FAKE_QA_TOKEN },
      { role: 'admin', tenantId: 'evil-tenant' },
    );

    const res = await POST(req);

    expect(res.status).toBe(403);
    expect(res.headers.get('set-cookie')).toBeNull();

    const body = await res.json();
    expect(body.error).toBeDefined();
    // Must not reveal session success
    expect(body).not.toHaveProperty('user');
    expect(body).not.toHaveProperty('success');
  });

  it('returns 403 with no Set-Cookie when VERCEL_ENV=preview and token is valid', async () => {
    process.env.VERCEL_ENV = 'preview';
    delete process.env.NODE_ENV;

    const { POST } = await import('../route');

    const req = makeBootstrapRequest(
      { 'x-qa-token': FAKE_QA_TOKEN },
      { role: 'operator', tenantId: 'evil-tenant' },
    );

    const res = await POST(req);

    expect(res.status).toBe(403);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('returns 403 with no Set-Cookie when NODE_ENV=production and token is valid', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.VERCEL_ENV;

    const { POST } = await import('../route');

    const req = makeBootstrapRequest(
      { 'x-qa-token': FAKE_QA_TOKEN },
      { role: 'admin', tenantId: 'evil-tenant' },
    );

    const res = await POST(req);

    expect(res.status).toBe(403);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('returns 403 without emitting cookie even when body contains arbitrary role/tenantId in preview', async () => {
    process.env.VERCEL_ENV = 'preview';
    delete process.env.NODE_ENV;

    const { POST } = await import('../route');

    const req = makeBootstrapRequest(
      { 'x-qa-token': FAKE_QA_TOKEN },
      { role: 'supreme', tenantId: 'adversarial-tenant-999' },
    );

    const res = await POST(req);

    expect(res.status).toBe(403);
    expect(res.headers.get('set-cookie')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Dev / test — should still work (regression guard)
// ---------------------------------------------------------------------------

describe('QA Bootstrap — Dev/test passthrough', () => {
  it('does NOT return 403 when VERCEL_ENV is unset and NODE_ENV is development', async () => {
    // Simulate a local dev environment
    delete process.env.VERCEL_ENV;
    delete process.env.APP_ENV;
    process.env.NODE_ENV = 'development';

    // Mock downstream dependencies so we don't need a real DB/session signing key.
    vi.mock('@/infra/auth/session', () => ({
      createSessionToken: vi.fn().mockResolvedValue('fake-signed-token'),
      COOKIE_NAME: 'condstore_session',
    }));
    vi.mock('@/infra/logger', () => ({
      logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
    }));

    const { POST } = await import('../route');

    const req = makeBootstrapRequest(
      { 'x-qa-token': FAKE_QA_TOKEN },
      { role: 'admin', tenantId: 'qa-tenant' },
    );

    const res = await POST(req);

    // In dev, the route should proceed past the lockdown guard.
    // It may fail further down (e.g. session signing) but must NOT return 403.
    expect(res.status).not.toBe(403);
  });
});
