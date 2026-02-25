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
import { structuredLogger } from '../log/logger';
import { getSessionUser } from '../auth/session';
import { ErrorCode, errorResponse } from './error-response';

const TRACE_REQUEST_ID = Symbol.for('condstore.requestId');

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

export function getTracedRequestId(request: NextRequest): string | undefined {
  const anyReq = request as unknown as Record<string | symbol, unknown>;
  const fromSymbol = anyReq[TRACE_REQUEST_ID];
  if (typeof fromSymbol === 'string' && fromSymbol.trim()) return fromSymbol.trim();
  const fromProp = anyReq.__requestId;
  if (typeof fromProp === 'string' && fromProp.trim()) return fromProp.trim();
  const fromHeader = request.headers.get('x-request-id')?.trim() ||
                     request.headers.get('x-vercel-id')?.trim();
  return fromHeader || undefined;
}

export function attachRequestIdHeader(response: NextResponse, requestId: string): NextResponse {
  response.headers.set('x-request-id', requestId);
  return response;
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
    // Expose requestId to handlers that need to persist/return it.
    // This is safe: NextRequest is an object and we only attach non-PII metadata.
    (request as unknown as Record<string | symbol, unknown>)[TRACE_REQUEST_ID] = requestId;
    (request as unknown as Record<string, unknown>).__requestId = requestId;
    const startTime = Date.now();

    try {
      // Log start
      const context = await buildRequestContext(request, requestId);
      structuredLogger.info('api_request_start', {
        requestId: context.requestId,
        route: context.path,
        tenantId: context.tenantId,
        method: context.method,
        eventType: 'api_request_start',
      });

      // Execute handler
      const response = await handler(request);

      // Add X-Request-Id header to response
      const latencyMs = Date.now() - startTime;
      attachRequestIdHeader(response, requestId);

      // Log end
      structuredLogger.info('api_request_end', {
        requestId,
        route: context.path,
        tenantId: context.tenantId,
        durationMs: latencyMs,
        status: response.status,
        outcome: response.status >= 400 ? 'error' : 'ok',
        errorCode: response.status >= 400 ? `${response.status}` : undefined,
        eventType: 'api_request_end',
      });

      return response;
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      // Log error
      structuredLogger.error('api_request_error', {
        requestId,
        durationMs: latencyMs,
        eventType: 'api_request_error',
        errorCode: ErrorCode.UNKNOWN,
        error,
      });

      // Return 500 with request ID
      return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Internal server error');
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
      structuredLogger.info('webhook_request_start', {
        requestId,
        route: new URL(request.url).pathname,
        method: request.method,
        eventType: 'webhook_request_start',
      });

      // Execute handler
      const response = await handler(request, requestId);

      // Add X-Request-Id header to response
      const latencyMs = Date.now() - startTime;
      attachRequestIdHeader(response, requestId);

      // Log end
      structuredLogger.info('webhook_request_end', {
        requestId,
        route: new URL(request.url).pathname,
        durationMs: latencyMs,
        status: response.status,
        outcome: response.status >= 400 ? 'error' : 'ok',
        errorCode: response.status >= 400 ? `${response.status}` : undefined,
        eventType: 'webhook_request_end',
      });

      return response;
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      // Log error
      structuredLogger.error('webhook_request_error', {
        requestId,
        durationMs: latencyMs,
        eventType: 'webhook_request_error',
        errorCode: ErrorCode.UNKNOWN,
        error,
      });

      // Return 500 with request ID
      return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Internal server error');
    }
  };
}
