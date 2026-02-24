/**
 * Request tracing and structured logging for API routes.
 *
 * Provides consistent request/response logging with:
 * - Request ID tracking (X-Request-Id header)
 * - Latency measurements
 * - Tenant ID extraction from session
 * - No PII/secret leakage in logs
 */

import { NextResponse, NextRequest } from 'next/server';
import { logger } from '../logger';
import { getSessionUser } from '../auth/session';

/**
 * Generate a unique request ID from header or create new UUID.
 */
export function makeRequestId(request?: NextRequest): string {
  if (request) {
    const fromHeader = request.headers.get('x-request-id')?.trim() ||
                       request.headers.get('x-vercel-id')?.trim();
    if (fromHeader) return fromHeader;
  }
  return crypto.randomUUID();
}

/**
 * Extract context for logging (tenantId, method, path, etc.)
 * Does NOT leak secrets or PII.
 */
interface RequestContext {
  requestId: string;
  method: string;
  path: string;
  tenantId?: string;
}

/**
 * Build log context by safely extracting tenantId from session.
 */
async function buildRequestContext(request: NextRequest, requestId: string): Promise<RequestContext> {
  const method = request.method;
  const path = new URL(request.url).pathname;

  let tenantId: string | undefined;
  try {
    const session = await getSessionUser(request);
    tenantId = session?.tenantId?.trim();
  } catch {
    // Session not available or invalid — tenantId remains undefined
  }

  return {
    requestId,
    method,
    path,
    ...(tenantId && { tenantId }),
  };
}

/**
 * Wrap a route handler with request tracing.
 *
 * Usage:
 *   export const GET = withRequestTrace(async (request) => {
 *     // handler code
 *   });
 *
 * Logs:
 * - api_request_start: at beginning with requestId, method, path, tenantId
 * - api_request_end: at completion with status, latencyMs, tenantId
 */
export function withRequestTrace(
  handler: (request: NextRequest) => Promise<NextResponse>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = makeRequestId(request);
    const startTime = Date.now();

    try {
      // Log start
      const context = await buildRequestContext(request, requestId);
      logger.info('api_request_start', {
        requestId: context.requestId,
        method: context.method,
        path: context.path,
        ...(context.tenantId && { tenantId: context.tenantId }),
      });

      // Execute handler
      const response = await handler(request);

      // Add X-Request-Id header to response
      const latencyMs = Date.now() - startTime;
      const newHeaders = new Headers(response.headers);
      newHeaders.set('X-Request-Id', requestId);

      // Log end
      logger.info('api_request_end', {
        requestId,
        status: response.status,
        latencyMs,
        ...(context.tenantId && { tenantId: context.tenantId }),
      });

      return new NextResponse(response.body, {
        status: response.status,
        headers: newHeaders,
      });
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      // Log error
      logger.error('api_request_error', error instanceof Error ? error : new Error(String(error)), {
        requestId,
        latencyMs,
      });

      // Return 500 with request ID
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
        },
      );
    }
  };
}

/**
 * Lightweight wrapper for webhook-like endpoints that should log only start/end,
 * without detailed body inspection.
 *
 * Usage:
 *   export const POST = withWebhookTrace(async (request) => {
 *     // webhook handler
 *   });
 *
 * Logs:
 * - webhook_request_start: minimal context (no body)
 * - webhook_request_end: status and latency
 */
export function withWebhookTrace(
  handler: (request: NextRequest, requestId: string) => Promise<NextResponse>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = makeRequestId(request);
    const startTime = Date.now();

    try {
      // Log start
      logger.info('webhook_request_start', {
        requestId,
        method: request.method,
        path: new URL(request.url).pathname,
      });

      // Execute handler
      const response = await handler(request, requestId);

      // Add X-Request-Id header to response
      const latencyMs = Date.now() - startTime;
      const newHeaders = new Headers(response.headers);
      newHeaders.set('X-Request-Id', requestId);

      // Log end
      logger.info('webhook_request_end', {
        requestId,
        status: response.status,
        latencyMs,
      });

      return new NextResponse(response.body, {
        status: response.status,
        headers: newHeaders,
      });
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      // Log error
      logger.error('webhook_request_error', error instanceof Error ? error : new Error(String(error)), {
        requestId,
        latencyMs,
      });

      // Return 500 with request ID
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
        },
      );
    }
  };
}
