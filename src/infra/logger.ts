/**
 * Structured logging system.
 * Provides consistent logging across the application.
 */

import { appConfig } from '../config/app.config';
import type { BaseError } from './errors';
import { captureExceptionWithSentryNonBlocking } from './observability/sentry';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const logLevelMap: Record<string, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
};

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    code?: string;
    stack?: string;
  };
}

const SAFE_LOG_KEY_ALLOWLIST = new Set([
  'requestid',
  'tenantid',
  'userid',
  'route',
  'errorcode',
  'durationms',
]);

const REDACT_LOG_KEY_PATTERNS = [
  /api.?key/i,
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

function shouldRedactLogKey(key: string): boolean {
  const normalized = key.toLowerCase();
  if (SAFE_LOG_KEY_ALLOWLIST.has(normalized)) return false;
  return REDACT_LOG_KEY_PATTERNS.some((pattern) => pattern.test(normalized));
}

function sanitizeLogValue(value: unknown, key?: string, depth = 0): unknown {
  if (key && shouldRedactLogKey(key)) {
    return '[REDACTED]';
  }

  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (depth >= 2) return '[TRUNCATED]';

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeLogValue(item, undefined, depth + 1));
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
      out[childKey] = sanitizeLogValue(childValue, childKey, depth + 1);
    }
    return out;
  }

  return String(value);
}

class Logger {
  private minLevel: LogLevel;

  constructor() {
    this.minLevel = logLevelMap[appConfig.logLevel] || LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatLog(level: string, message: string, context?: LogContext, error?: Error | BaseError): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (context && Object.keys(context).length > 0) {
      entry.context = sanitizeLogValue(context) as LogContext;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: appConfig.env === 'development' ? error.stack : undefined,
      };

      if ('code' in error) {
        entry.error.code = error.code as string;
      }
    }

    return entry;
  }

  private log(level: LogLevel, levelName: string, message: string, context?: LogContext, error?: Error | BaseError): void {
    if (!this.shouldLog(level)) return;

    const entry = this.formatLog(levelName, message, context, error);

    // In production, you might want to send this to a logging service
    // For now, we'll use console with structured output
    const output = JSON.stringify(entry);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(output);
        break;
      case LogLevel.INFO:
        console.info(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
        console.error(output);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, 'INFO', message, context);
  }

  warn(message: string, context?: LogContext, error?: Error | BaseError): void {
    this.log(LogLevel.WARN, 'WARN', message, context, error);
  }

  error(message: string, error?: Error | BaseError, context?: LogContext): void {
    if (error) {
      const requestId = typeof context?.requestId === 'string' ? context.requestId : undefined;
      const tenantId = typeof context?.tenantId === 'string' ? context.tenantId : undefined;
      captureExceptionWithSentryNonBlocking(error, {
        requestId,
        tenantId,
        extras: {
          logger: 'app',
          logMessage: message,
          context: sanitizeLogValue(context) as LogContext | undefined,
        },
        tags: {
          logger: 'app',
        },
      });
    }
    this.log(LogLevel.ERROR, 'ERROR', message, context, error);
  }

  /**
   * Log HTTP request/response for debugging.
   */
  http(method: string, url: string, status: number, duration: number, context?: LogContext): void {
    this.info(`HTTP ${method} ${url} ${status} ${duration}ms`, context);
  }

  /**
   * Log state transition in conversation flow.
   */
  stateTransition(from: string, to: string, phoneNumber: string, context?: LogContext): void {
    this.info(`State transition: ${from} → ${to}`, {
      ...context,
      phoneNumber: this.maskPhone(phoneNumber),
    });
  }

  /**
   * Mask phone number for privacy (keep last 4 digits).
   */
  /**
   * Mask phone number for privacy (keep last 4 digits).
   */
  maskPhone(phoneNumber: string): string {
    if (!phoneNumber) return '';
    if (phoneNumber.length <= 4) return '****';
    return '*'.repeat(phoneNumber.length - 4) + phoneNumber.slice(-4);
  }
}

// Export singleton instance
export const logger = new Logger();
