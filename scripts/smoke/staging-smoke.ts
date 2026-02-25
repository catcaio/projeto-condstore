/* eslint-disable no-console */

type StepStatus = 'PASS' | 'FAIL' | 'SKIP';

interface StepResult {
  name: string;
  status: StepStatus;
  detail?: string;
}

interface HttpResult {
  status: number;
  headers: Headers;
  bodyText: string;
  bodyJson: unknown | null;
}

interface SessionCookieAuth {
  cookie: string;
  source: 'env-token' | 'login';
}

type RoleName = 'admin' | 'operator';

const COOKIE_NAME = 'condstore_session';

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function requireBaseUrl(): string {
  const base =
    readEnv('STAGING_URL') ||
    readEnv('SMOKE_BASE_URL') ||
    process.argv[2]?.trim() ||
    null;

  if (!base) {
    throw new Error('Missing STAGING_URL (or SMOKE_BASE_URL / first arg)');
  }

  const normalized = base.replace(/\/+$/, '');
  const url = new URL(normalized);
  if (!/^https?:$/.test(url.protocol)) {
    throw new Error('STAGING_URL must be http(s)');
  }
  return normalized;
}

function maskSecretForLog(value: string | null): string {
  if (!value) return 'missing';
  return `set(len=${value.length})`;
}

function redactUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.searchParams.has('token')) {
    parsed.searchParams.set('token', '[REDACTED]');
  }
  return parsed.toString();
}

async function httpRequest(
  url: string,
  init?: RequestInit & { expectJson?: boolean },
): Promise<HttpResult> {
  const response = await fetch(url, {
    redirect: 'manual',
    ...init,
    headers: {
      'x-request-id': init?.headers instanceof Headers
        ? init.headers.get('x-request-id') ?? crypto.randomUUID()
        : (init?.headers as Record<string, string> | undefined)?.['x-request-id'] ?? crypto.randomUUID(),
      ...(init?.headers instanceof Headers
        ? Object.fromEntries(init.headers.entries())
        : (init?.headers as Record<string, string> | undefined) ?? {}),
    },
  });

  const bodyText = await response.text();
  let bodyJson: unknown | null = null;
  if ((init?.expectJson ?? true) && bodyText) {
    try {
      bodyJson = JSON.parse(bodyText);
    } catch {
      bodyJson = null;
    }
  }

  return {
    status: response.status,
    headers: response.headers,
    bodyText,
    bodyJson,
  };
}

function parseCookieFromSetCookie(setCookieHeader: string | null, cookieName: string): string | null {
  if (!setCookieHeader) return null;
  const pattern = new RegExp(`(?:^|,\\s*)${cookieName}=([^;]+)`);
  const match = setCookieHeader.match(pattern);
  return match?.[1] ?? null;
}

function buildSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}`;
}

function hasRequestId(headers: Headers): boolean {
  return Boolean(headers.get('x-request-id')?.trim());
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function loginAndCaptureCookie(
  baseUrl: string,
  role: RoleName,
): Promise<SessionCookieAuth | null> {
  const email = readEnv(`LOGIN_${role.toUpperCase()}_EMAIL`);
  const password = readEnv(`LOGIN_${role.toUpperCase()}_PASSWORD`);
  if (!email || !password) return null;

  const url = `${baseUrl}/api/auth/login`;
  const res = await httpRequest(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.55',
    },
    body: JSON.stringify({ email, password }),
  });

  if (res.status !== 200) {
    throw new Error(`login(${role}) failed with status ${res.status}`);
  }

  const token = parseCookieFromSetCookie(res.headers.get('set-cookie'), COOKIE_NAME);
  if (!token) {
    throw new Error(`login(${role}) missing ${COOKIE_NAME} cookie`);
  }

  return {
    cookie: buildSessionCookie(token),
    source: 'login',
  };
}

async function getRoleAuth(baseUrl: string, role: RoleName): Promise<SessionCookieAuth | null> {
  const envToken = readEnv(`TOKEN_${role.toUpperCase()}`);
  if (envToken) {
    return {
      cookie: buildSessionCookie(envToken),
      source: 'env-token',
    };
  }

  return loginAndCaptureCookie(baseUrl, role);
}

function push(results: StepResult[], result: StepResult): void {
  results.push(result);
  const line = `[${result.status}] ${result.name}${result.detail ? ` - ${result.detail}` : ''}`;
  if (result.status === 'FAIL') {
    console.error(line);
  } else {
    console.log(line);
  }
}

function ensureStatus(name: string, actual: number, expected: number | number[]): StepResult | null {
  const allowed = Array.isArray(expected) ? expected : [expected];
  if (!allowed.includes(actual)) {
    return {
      name,
      status: 'FAIL',
      detail: `expected status ${allowed.join('/')} got ${actual}`,
    };
  }
  return null;
}

async function smoke(): Promise<number> {
  const baseUrl = requireBaseUrl();
  const results: StepResult[] = [];
  let failed = false;

  console.log(`Base URL: ${baseUrl}`);
  console.log('Env presence (masked):');
  for (const key of [
    'INTERNAL_DIAG_TOKEN',
    'CRON_TOKEN',
    'TOKEN_ADMIN',
    'TOKEN_OPERATOR',
    'LOGIN_ADMIN_EMAIL',
    'LOGIN_ADMIN_PASSWORD',
    'LOGIN_OPERATOR_EMAIL',
    'LOGIN_OPERATOR_PASSWORD',
  ]) {
    console.log(`- ${key}: ${maskSecretForLog(readEnv(key))}`);
  }

  const internalDiagToken = readEnv('INTERNAL_DIAG_TOKEN');
  if (!internalDiagToken) {
    push(results, {
      name: 'GET /api/internal/diag (authorized)',
      status: 'SKIP',
      detail: 'INTERNAL_DIAG_TOKEN missing',
    });
  } else {
    try {
      const res = await httpRequest(`${baseUrl}/api/internal/diag`, {
        method: 'GET',
        headers: {
          'x-internal-token': internalDiagToken,
        },
      });
      const statusErr = ensureStatus('GET /api/internal/diag (authorized)', res.status, 200);
      if (statusErr) {
        push(results, statusErr);
        failed = true;
      } else if (!hasRequestId(res.headers)) {
        push(results, {
          name: 'GET /api/internal/diag (authorized)',
          status: 'FAIL',
          detail: 'missing x-request-id header',
        });
        failed = true;
      } else {
        const body = asObject(res.bodyJson);
        const db = body?.db;
        const redis = body?.redis;
        if (db !== 'ok' || redis !== 'ok') {
          push(results, {
            name: 'GET /api/internal/diag (authorized)',
            status: 'FAIL',
            detail: `expected db=ok and redis=ok, got db=${String(db)} redis=${String(redis)}`,
          });
          failed = true;
        } else {
          push(results, {
            name: 'GET /api/internal/diag (authorized)',
            status: 'PASS',
            detail: `db=${String(db)} redis=${String(redis)} reqId=${res.headers.get('x-request-id')}`,
          });
        }
      }
    } catch (error) {
      push(results, {
        name: 'GET /api/internal/diag (authorized)',
        status: 'FAIL',
        detail: (error as Error).message,
      });
      failed = true;
    }
  }

  // Unauthorized metrics check: prefer /api/cockpit/metrics/base if route exists, fallback to /api/cockpit/metrics
  let metricsUnauthorizedPath = '/api/cockpit/metrics/base';
  try {
    let res = await httpRequest(`${baseUrl}${metricsUnauthorizedPath}`, { method: 'GET' });
    if (res.status === 404) {
      metricsUnauthorizedPath = '/api/cockpit/metrics';
      res = await httpRequest(`${baseUrl}${metricsUnauthorizedPath}`, { method: 'GET' });
    }

    const statusErr = ensureStatus(`GET ${metricsUnauthorizedPath} (no auth)`, res.status, 401);
    if (statusErr) {
      push(results, statusErr);
      failed = true;
    } else if (!hasRequestId(res.headers)) {
      push(results, {
        name: `GET ${metricsUnauthorizedPath} (no auth)`,
        status: 'FAIL',
        detail: 'missing x-request-id header',
      });
      failed = true;
    } else {
      push(results, {
        name: `GET ${metricsUnauthorizedPath} (no auth)`,
        status: 'PASS',
        detail: `reqId=${res.headers.get('x-request-id')}`,
      });
    }
  } catch (error) {
    push(results, {
      name: 'GET /api/cockpit/metrics[/base] (no auth)',
      status: 'FAIL',
      detail: (error as Error).message,
    });
    failed = true;
  }

  let operatorAuth: SessionCookieAuth | null = null;
  let adminAuth: SessionCookieAuth | null = null;

  try {
    operatorAuth = await getRoleAuth(baseUrl, 'operator');
    if (!operatorAuth) {
      push(results, {
        name: 'Auth for operator',
        status: 'SKIP',
        detail: 'provide TOKEN_OPERATOR or LOGIN_OPERATOR_EMAIL/PASSWORD',
      });
    } else {
      push(results, {
        name: 'Auth for operator',
        status: 'PASS',
        detail: `source=${operatorAuth.source}`,
      });
    }
  } catch (error) {
    push(results, {
      name: 'Auth for operator',
      status: 'FAIL',
      detail: (error as Error).message,
    });
    failed = true;
  }

  try {
    adminAuth = await getRoleAuth(baseUrl, 'admin');
    if (!adminAuth) {
      push(results, {
        name: 'Auth for admin',
        status: 'SKIP',
        detail: 'provide TOKEN_ADMIN or LOGIN_ADMIN_EMAIL/PASSWORD',
      });
    } else {
      push(results, {
        name: 'Auth for admin',
        status: 'PASS',
        detail: `source=${adminAuth.source}`,
      });
    }
  } catch (error) {
    push(results, {
      name: 'Auth for admin',
      status: 'FAIL',
      detail: (error as Error).message,
    });
    failed = true;
  }

  if (operatorAuth) {
    try {
      const res = await httpRequest(`${baseUrl}/api/cockpit/metrics/freight`, {
        method: 'GET',
        headers: { cookie: operatorAuth.cookie },
      });
      const statusErr = ensureStatus('GET /api/cockpit/metrics/freight (operator)', res.status, 403);
      if (statusErr) {
        push(results, statusErr);
        failed = true;
      } else if (!hasRequestId(res.headers)) {
        push(results, {
          name: 'GET /api/cockpit/metrics/freight (operator)',
          status: 'FAIL',
          detail: 'missing x-request-id header',
        });
        failed = true;
      } else {
        push(results, {
          name: 'GET /api/cockpit/metrics/freight (operator)',
          status: 'PASS',
          detail: `reqId=${res.headers.get('x-request-id')}`,
        });
      }
    } catch (error) {
      push(results, {
        name: 'GET /api/cockpit/metrics/freight (operator)',
        status: 'FAIL',
        detail: (error as Error).message,
      });
      failed = true;
    }
  }

  if (adminAuth) {
    try {
      const freightRes = await httpRequest(`${baseUrl}/api/cockpit/metrics/freight`, {
        method: 'GET',
        headers: { cookie: adminAuth.cookie },
      });
      const statusErr = ensureStatus('GET /api/cockpit/metrics/freight (admin)', freightRes.status, 200);
      if (statusErr) {
        push(results, statusErr);
        failed = true;
      } else if (!hasRequestId(freightRes.headers)) {
        push(results, {
          name: 'GET /api/cockpit/metrics/freight (admin)',
          status: 'FAIL',
          detail: 'missing x-request-id header',
        });
        failed = true;
      } else {
        push(results, {
          name: 'GET /api/cockpit/metrics/freight (admin)',
          status: 'PASS',
          detail: `reqId=${freightRes.headers.get('x-request-id')}`,
        });
      }

      if (adminAuth.source === 'login') {
        const meBefore = await httpRequest(`${baseUrl}/api/auth/me`, {
          method: 'GET',
          headers: { cookie: adminAuth.cookie },
        });
        if (meBefore.status === 200) {
          push(results, {
            name: 'GET /api/auth/me (admin before logout)',
            status: 'PASS',
          });
        } else {
          push(results, {
            name: 'GET /api/auth/me (admin before logout)',
            status: 'FAIL',
            detail: `expected 200 got ${meBefore.status}`,
          });
          failed = true;
        }

        const logoutRes = await httpRequest(`${baseUrl}/api/auth/logout`, {
          method: 'POST',
          headers: { cookie: adminAuth.cookie },
        });
        const logoutStatusErr = ensureStatus('POST /api/auth/logout', logoutRes.status, 200);
        if (logoutStatusErr) {
          push(results, logoutStatusErr);
          failed = true;
        } else if (!hasRequestId(logoutRes.headers)) {
          push(results, {
            name: 'POST /api/auth/logout',
            status: 'FAIL',
            detail: 'missing x-request-id header',
          });
          failed = true;
        } else {
          push(results, {
            name: 'POST /api/auth/logout',
            status: 'PASS',
            detail: `reqId=${logoutRes.headers.get('x-request-id')}`,
          });
        }

        const meAfter = await httpRequest(`${baseUrl}/api/auth/me`, {
          method: 'GET',
          headers: { cookie: adminAuth.cookie },
        });
        const meAfterErr = ensureStatus('GET /api/auth/me (old token after logout)', meAfter.status, 401);
        if (meAfterErr) {
          push(results, meAfterErr);
          failed = true;
        } else {
          push(results, {
            name: 'GET /api/auth/me (old token after logout)',
            status: 'PASS',
          });
        }
      } else {
        push(results, {
          name: 'Logout invalidation smoke',
          status: 'SKIP',
          detail: 'admin auth came from TOKEN_ADMIN; provide login creds to validate logout invalidation',
        });
      }
    } catch (error) {
      push(results, {
        name: 'Admin-authenticated smoke checks',
        status: 'FAIL',
        detail: (error as Error).message,
      });
      failed = true;
    }
  }

  try {
    const res = await httpRequest(`${baseUrl}/api/cron/cleanup`, { method: 'GET' });
    const statusErr = ensureStatus('GET /api/cron/cleanup (no auth)', res.status, 401);
    if (statusErr) {
      push(results, statusErr);
      failed = true;
    } else if (!hasRequestId(res.headers)) {
      push(results, {
        name: 'GET /api/cron/cleanup (no auth)',
        status: 'FAIL',
        detail: 'missing x-request-id header',
      });
      failed = true;
    } else {
      push(results, {
        name: 'GET /api/cron/cleanup (no auth)',
        status: 'PASS',
        detail: `reqId=${res.headers.get('x-request-id')}`,
      });
    }
  } catch (error) {
    push(results, {
      name: 'GET /api/cron/cleanup (no auth)',
      status: 'FAIL',
      detail: (error as Error).message,
    });
    failed = true;
  }

  const cronToken = readEnv('CRON_TOKEN');
  if (!cronToken) {
    push(results, {
      name: 'GET /api/cron/cleanup?token=CRON_TOKEN',
      status: 'SKIP',
      detail: 'CRON_TOKEN missing',
    });
  } else {
    try {
      const url = new URL(`${baseUrl}/api/cron/cleanup`);
      url.searchParams.set('token', cronToken);

      const res = await httpRequest(url.toString(), { method: 'GET' });
      const statusErr = ensureStatus('GET /api/cron/cleanup?token=CRON_TOKEN', res.status, 200);
      if (statusErr) {
        push(results, {
          ...statusErr,
          detail: `${statusErr.detail}; url=${redactUrl(url.toString())}`,
        });
        failed = true;
      } else if (!hasRequestId(res.headers)) {
        push(results, {
          name: 'GET /api/cron/cleanup?token=CRON_TOKEN',
          status: 'FAIL',
          detail: `missing x-request-id header; url=${redactUrl(url.toString())}`,
        });
        failed = true;
      } else {
        push(results, {
          name: 'GET /api/cron/cleanup?token=CRON_TOKEN',
          status: 'PASS',
          detail: `reqId=${res.headers.get('x-request-id')}`,
        });
      }
    } catch (error) {
      push(results, {
        name: 'GET /api/cron/cleanup?token=CRON_TOKEN',
        status: 'FAIL',
        detail: (error as Error).message,
      });
      failed = true;
    }
  }

  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  const skipCount = results.filter((r) => r.status === 'SKIP').length;
  console.log(`Summary: PASS=${passCount} FAIL=${failCount} SKIP=${skipCount}`);

  return failed ? 1 : 0;
}

smoke()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(`[FAIL] staging-smoke bootstrap - ${(error as Error).message}`);
    process.exitCode = 1;
  });
