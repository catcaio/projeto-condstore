import { captureExceptionWithSentryNonBlocking } from '../observability/sentry';

export type StructuredLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface StructuredLogContext {
  requestId?: string;
  tenantId?: string;
  route?: string;
  userId?: string;
  eventType?: string;
  errorCode?: string;
  durationMs?: number;
  [key: string]: unknown;
}

interface StructuredLogEntry {
  timestamp: string;
  level: StructuredLogLevel;
  message: string;
  context?: StructuredLogContext;
}

const SAFE_SECRET_KEY_ALLOWLIST = new Set([
  'requestid',
  'x-request-id',
  'tenantid',
  'userid',
  'route',
  'eventtype',
  'errorcode',
  'durationms',
]);

const REDACT_KEY_PATTERNS = [
  /api.?key/i,
  /authorization/i,
  /cookie/i,
  /secret/i,
  /password/i,
  /token/i,
];

function shouldRedactKey(rawKey: string): boolean {
  const key = rawKey.toLowerCase();
  if (SAFE_SECRET_KEY_ALLOWLIST.has(key)) return false;
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

  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;

  if (depth >= 2) {
    return '[TRUNCATED]';
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item, undefined, depth + 1));
  }

  if (typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};

    for (const [childKey, childValue] of Object.entries(input)) {
      out[childKey] = sanitizeValue(childValue, childKey, depth + 1);
    }

    return out;
  }

  return String(value);
}

export function log(level: StructuredLogLevel, message: string, context?: StructuredLogContext): void {
  const entry: StructuredLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (context && Object.keys(context).length > 0) {
    entry.context = sanitizeValue(context) as StructuredLogContext;
  }

  console.log(JSON.stringify(entry));
}

export const structuredLogger = {
  log,
  debug(message: string, context?: StructuredLogContext) {
    log('debug', message, context);
  },
  info(message: string, context?: StructuredLogContext) {
    log('info', message, context);
  },
  warn(message: string, context?: StructuredLogContext) {
    log('warn', message, context);
  },
  error(message: string, context?: StructuredLogContext) {
    const rawError = context?.error;
    const error =
      rawError instanceof Error
        ? rawError
        : rawError
          ? new Error(typeof rawError === 'string' ? rawError : message)
          : null;

    if (error) {
      captureExceptionWithSentryNonBlocking(error, {
        requestId: typeof context?.requestId === 'string' ? context.requestId : undefined,
        tenantId: typeof context?.tenantId === 'string' ? context.tenantId : undefined,
        extras: {
          logger: 'structured',
          logMessage: message,
          context,
        },
        tags: {
          logger: 'structured',
        },
      });
    }

    log('error', message, context);
  },
};

