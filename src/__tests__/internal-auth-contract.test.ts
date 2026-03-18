import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { requireInternalToken } from '@/infra/auth/tenant-route-guard';
import { assertCriticalEnvSetup } from '@/infra/env/require-env';

function makeRequest(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, { headers: new Headers(headers) });
}

describe('internal auth contract', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    process.env = { ...process.env };
    delete process.env.INTERNAL_DIAG_TOKEN;
    delete process.env.INTERNAL_EXPORT_TOKEN;
    delete process.env.INTERNAL_JOB_TOKEN;
    delete process.env.INTERNAL_TOKEN;
    delete process.env.QA_BOOTSTRAP_TOKEN;
    delete process.env.BOOTSTRAP_TOKEN;
    delete process.env.CI;
    process.env.NODE_ENV = 'test';
    process.env.AUTH_SECRET = 'test-secret-at-least-16-chars';
    process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/db';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  it('authorizes a valid diag token for diag routes', () => {
    process.env.INTERNAL_DIAG_TOKEN = 'diag-secret';

    const result = requireInternalToken(
      makeRequest('http://localhost/api/internal/diag', { 'x-internal-token': 'diag-secret' }),
      { purpose: ['diag'] },
    );

    expect(result.ok).toBe(true);
  });

  it('rejects an invalid token', () => {
    process.env.INTERNAL_EXPORT_TOKEN = 'export-secret';

    const result = requireInternalToken(
      makeRequest('http://localhost/api/internal/export', { 'x-internal-token': 'wrong-secret' }),
      { purpose: ['export'] },
    );

    expect(result.ok).toBe(false);
    expect((result as any).response.status).toBe(401);
  });

  it('rejects a valid token when the purpose is wrong', () => {
    process.env.INTERNAL_DIAG_TOKEN = 'diag-secret';

    const result = requireInternalToken(
      makeRequest('http://localhost/api/internal/jobs/run', { 'x-internal-token': 'diag-secret' }),
      { purpose: ['jobs'] },
    );

    expect(result.ok).toBe(false);
    expect((result as any).response.status).toBe(401);
  });

  it('keeps explicit legacy compatibility for INTERNAL_TOKEN on jobs routes', () => {
    process.env.INTERNAL_TOKEN = 'legacy-job-secret';

    const result = requireInternalToken(
      makeRequest('http://localhost/api/internal/jobs/run', { 'x-internal-token': 'legacy-job-secret' }),
      { purpose: ['jobs'] },
    );

    expect(result.ok).toBe(true);
  });

  it('keeps explicit legacy header compatibility for QA bootstrap', () => {
    process.env.QA_BOOTSTRAP_TOKEN = 'qa-secret';

    const result = requireInternalToken(
      makeRequest('http://localhost/api/internal/qa/setup', { 'x-qa-bootstrap': 'qa-secret' }),
      { purpose: ['qa_bootstrap'] },
    );

    expect(result.ok).toBe(true);
  });

  it('keeps local/dev boot coherent with session AUTH_SECRET fallback', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.AUTH_SECRET;

    expect(() => assertCriticalEnvSetup()).not.toThrow();
  });

  it('still requires AUTH_SECRET in strict runtimes', () => {
    process.env.NODE_ENV = 'production';
    process.env.VERCEL_ENV = 'production';
    process.env.INTERNAL_DIAG_TOKEN = 'diag-secret';
    process.env.INTERNAL_EXPORT_TOKEN = 'export-secret';
    process.env.INTERNAL_JOB_TOKEN = 'job-secret';
    delete process.env.AUTH_SECRET;

    expect(() => assertCriticalEnvSetup()).toThrow(/AUTH_SECRET/);
  });

  it('fails early in strict runtime when critical internal tokens are missing', () => {
    process.env.NODE_ENV = 'production';
    process.env.VERCEL_ENV = 'preview';

    expect(() => assertCriticalEnvSetup()).toThrow(
      /INTERNAL_DIAG_TOKEN, INTERNAL_EXPORT_TOKEN, INTERNAL_JOB_TOKEN/,
    );
  });
});
