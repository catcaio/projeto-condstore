import { NextResponse } from 'next/server';
import { BaseError, InfrastructureError } from '../errors';
import { logger } from '../logger';

/**
 * Generate a unique request ID for tracing.
 */
export function makeRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Structured HTTP response for infrastructure errors.
 * Returns 503 for retryable (infrastructure) errors, 500 for others.
 * Never leaks stack traces, URLs, or secrets.
 */
export function respondInfraError(error: unknown, requestId: string): NextResponse {
  // Log the full error for debugging (internal only)
  logger.error('Infrastructure error', error instanceof Error ? error : new Error(String(error)));

  // Handle typed BaseError
  if (error instanceof BaseError) {
    const status = error.isRetryable ? 503 : 500;
    const headers: Record<string, string> = {
      'X-Request-Id': requestId,
    };
    if (error.isRetryable) {
      headers['Retry-After'] = '60';
    }
    return NextResponse.json(
      {
        error: 'INFRASTRUCTURE_ERROR',
        code: error.code,
        retryable: error.isRetryable,
        requestId,
      },
      {
        status,
        headers,
      }
    );
  }

  // Generic error (avoid leaking details)
  return NextResponse.json(
    {
      error: 'INTERNAL_SERVER_ERROR',
      requestId,
    },
    {
      status: 500,
      headers: {
        'X-Request-Id': requestId,
      },
    }
  );
}

/**
 * Wrap a route handler with structured error handling.
 * Usage:
 *   export const GET = withInfraErrorHandling(async (request) => {
 *     // handler code
 *   });
 */
export function withInfraErrorHandling(
  handler: (request: Request, requestId: string) => Promise<NextResponse>
) {
  return async (request: Request) => {
    const requestId = makeRequestId();
    try {
      return await handler(request, requestId);
    } catch (error) {
      return respondInfraError(error, requestId);
    }
  };
}
