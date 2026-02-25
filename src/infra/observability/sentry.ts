type SentryRuntime = 'server' | 'client' | 'edge';

type SentryScopeLike = {
  setTag?: (key: string, value: string) => void;
  setExtra?: (key: string, value: unknown) => void;
};

type SentryModuleLike = {
  init?: (options: Record<string, unknown>) => void;
  captureException?: (error: unknown) => void;
  withScope?: (callback: (scope: SentryScopeLike) => void) => void;
  captureRequestError?: (...args: unknown[]) => unknown;
};

interface CaptureSentryExceptionInput {
  requestId?: string;
  tenantId?: string;
  extras?: Record<string, unknown>;
  tags?: Record<string, string>;
}

const runtimeInitState: Partial<Record<SentryRuntime, boolean>> = {};
let sentryModulePromise: Promise<SentryModuleLike | null> | null = null;
let sentryModuleMissingWarned = false;

const SENSITIVE_HEADER_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'proxy-authorization',
  'x-api-key',
  'x-auth-token',
]);

const REDACT_KEY_PATTERNS = [
  /authorization/i,
  /cookie/i,
  /secret/i,
  /password/i,
  /token/i,
  /phone/i,
  /message/i,
  /body/i,
  /payload/i,
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseTraceSampleRate(): number {
  const raw = process.env.SENTRY_TRACES_SAMPLE_RATE?.trim();
  if (!raw) return 0.05;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0.05;
  if (parsed < 0) return 0;
  if (parsed > 1) return 1;
  return parsed;
}

function getRelease(): string {
  return (
    process.env.GIT_SHA?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.COMMIT_SHA?.trim() ||
    'dev'
  );
}

function getSentryDsn(): string | null {
  const dsn = process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  return dsn || null;
}

function isSentryEnabledByEnv(): boolean {
  return Boolean(getSentryDsn());
}

function shouldRedactKey(key: string): boolean {
  return REDACT_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function sanitizeValue(value: unknown, key?: string, depth = 0): unknown {
  if (key && shouldRedactKey(key)) {
    return '[REDACTED]';
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    };
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return value.length > 512 ? `${value.slice(0, 512)}…` : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (depth >= 3) {
    return '[TRUNCATED]';
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item, undefined, depth + 1));
  }

  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      out[childKey] = sanitizeValue(childValue, childKey, depth + 1);
    }
    return out;
  }

  return String(value);
}

function sanitizeHeaders(headers: unknown): unknown {
  if (!isPlainObject(headers)) return headers;

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    sanitized[key] = SENSITIVE_HEADER_KEYS.has(lower) ? '[REDACTED]' : sanitizeValue(value, key);
  }
  return sanitized;
}

function sanitizeBreadcrumbs(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.slice(0, 50).map((item) => {
    if (!isPlainObject(item)) return item;
    const breadcrumb: Record<string, unknown> = { ...item };
    if ('data' in breadcrumb) {
      breadcrumb.data = sanitizeValue(breadcrumb.data);
    }
    if (typeof breadcrumb.message === 'string' && /phone|message|body/i.test(breadcrumb.message)) {
      breadcrumb.message = '[REDACTED]';
    }
    return breadcrumb;
  });
}

function redactSentryEvent(event: unknown): unknown {
  if (!isPlainObject(event)) return event;

  const out: Record<string, unknown> = { ...event };

  if (isPlainObject(out.request)) {
    const request = { ...out.request } as Record<string, unknown>;
    if ('headers' in request) {
      request.headers = sanitizeHeaders(request.headers);
    }
    if ('data' in request) {
      request.data = '[REDACTED]';
    }
    if ('cookies' in request) {
      request.cookies = '[REDACTED]';
    }
    out.request = request;
  }

  if ('extra' in out) {
    out.extra = sanitizeValue(out.extra);
  }

  if ('breadcrumbs' in out) {
    out.breadcrumbs = sanitizeBreadcrumbs(out.breadcrumbs);
  }

  return out;
}

function buildInitOptions(runtime: SentryRuntime): Record<string, unknown> {
  return {
    dsn: getSentryDsn(),
    enabled: isSentryEnabledByEnv(),
    release: getRelease(),
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: parseTraceSampleRate(),
    sendDefaultPii: false,
    beforeSend(event: unknown) {
      return redactSentryEvent(event);
    },
    beforeBreadcrumb(breadcrumb: unknown) {
      const sanitized = sanitizeBreadcrumbs([breadcrumb]);
      return Array.isArray(sanitized) ? sanitized[0] ?? null : sanitized;
    },
    initialScope: {
      tags: {
        runtime,
      },
    },
  };
}

async function loadSentryModule(): Promise<SentryModuleLike | null> {
  if (sentryModulePromise) return sentryModulePromise;

  sentryModulePromise = (async () => {
    try {
      const importSentry = new Function('return import("@sentry/nextjs")') as () => Promise<unknown>;
      return (await importSentry()) as SentryModuleLike;
    } catch {
      if (!sentryModuleMissingWarned) {
        sentryModuleMissingWarned = true;
        console.warn('[sentry] @sentry/nextjs not installed; Sentry observability disabled.');
      }
      return null;
    }
  })();

  return sentryModulePromise;
}

function setCommonScopeContext(scope: SentryScopeLike, input?: CaptureSentryExceptionInput): void {
  if (!input) return;

  const requestId = input.requestId?.trim();
  if (requestId) {
    scope.setTag?.('requestId', requestId);
    scope.setExtra?.('requestId', requestId);
  }

  const tenantId = input.tenantId?.trim();
  if (tenantId) {
    scope.setTag?.('tenantId', tenantId);
    scope.setExtra?.('tenantId', tenantId);
  }

  if (input.tags) {
    for (const [key, value] of Object.entries(input.tags)) {
      if (!key || typeof value !== 'string') continue;
      scope.setTag?.(key, value);
    }
  }

  if (input.extras) {
    const extras = sanitizeValue(input.extras);
    if (isPlainObject(extras)) {
      for (const [key, value] of Object.entries(extras)) {
        scope.setExtra?.(key, value);
      }
    } else {
      scope.setExtra?.('context', extras);
    }
  }
}

export async function initSentryForRuntime(runtime: SentryRuntime): Promise<void> {
  if (runtimeInitState[runtime]) return;
  if (!isSentryEnabledByEnv()) {
    runtimeInitState[runtime] = true;
    return;
  }

  const sentry = await loadSentryModule();
  if (!sentry?.init) {
    runtimeInitState[runtime] = true;
    return;
  }

  sentry.init(buildInitOptions(runtime));
  runtimeInitState[runtime] = true;
}

export async function captureExceptionWithSentry(
  error: unknown,
  input?: CaptureSentryExceptionInput,
): Promise<void> {
  if (!isSentryEnabledByEnv()) return;

  const runtime: SentryRuntime =
    typeof window !== 'undefined'
      ? 'client'
      : process.env.NEXT_RUNTIME === 'edge'
        ? 'edge'
        : 'server';
  await initSentryForRuntime(runtime);

  const sentry = await loadSentryModule();
  if (!sentry?.captureException) return;

  const err = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error');

  if (typeof sentry.withScope === 'function') {
    sentry.withScope((scope) => {
      setCommonScopeContext(scope, input);
      sentry.captureException?.(err);
    });
    return;
  }

  sentry.captureException(err);
}

export function captureExceptionWithSentryNonBlocking(
  error: unknown,
  input?: CaptureSentryExceptionInput,
): void {
  void captureExceptionWithSentry(error, input);
}

export async function captureNextRequestErrorWithSentry(...args: unknown[]): Promise<void> {
  if (!isSentryEnabledByEnv()) return;

  const runtime: SentryRuntime = process.env.NEXT_RUNTIME === 'edge' ? 'edge' : 'server';
  await initSentryForRuntime(runtime);

  const sentry = await loadSentryModule();
  if (typeof sentry?.captureRequestError === 'function') {
    await sentry.captureRequestError(...args);
  }
}

export function getSentryReleaseForDiagnostics(): string {
  return getRelease();
}
