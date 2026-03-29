import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import { requireAdmin } from '@/infra/auth/guards';
import { publicEvents } from '../../../../../drizzle/schema';
import { requireActivePlan } from '@/modules/billing';
import { errorResponse, ErrorCode } from '@/infra/http/error-response';
import { getTracedRequestId, makeRequestId, withRequestTrace } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';

export const runtime = 'nodejs';


function isAnalyticsTableMissing(error: unknown): boolean {
  const errorObj = error as { message?: string; code?: string; cause?: { message?: string; code?: string } };
  const errorMessage = `${errorObj?.message ?? ''} ${errorObj?.cause?.message ?? ''}`.toLowerCase();
  const errorCode = `${errorObj?.code ?? ''} ${errorObj?.cause?.code ?? ''}`.toUpperCase();

  return (
    errorCode.includes('ER_NO_SUCH_TABLE') ||
    errorMessage.includes("doesn't exist") ||
    errorMessage.includes('unknown table') ||
    errorMessage.includes('table public_events')
  );
}

interface EventProps {
  [key: string]: unknown;
}

function safeParseProps(raw: string | null): EventProps | { _parseError: true; raw: string } | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as EventProps;
  } catch {
    return { _parseError: true, raw };
  }
}

async function handler(request: NextRequest): Promise<NextResponse> {
  const requestId = getTracedRequestId(request) ?? makeRequestId(request);
  const auth = await requireAdmin(request, { requestId });
  if (!auth.ok) {
    return auth.response;
  }

  const entitlement = await requireActivePlan(request);
  if (entitlement.errorResponse) {
    return entitlement.errorResponse;
  }
  const tenantId = entitlement.tenantId!;

  const searchParams = request.nextUrl.searchParams;
  const event = searchParams.get('event');
  const anonId = searchParams.get('anonId');
  const parsedLimit = Number.parseInt(searchParams.get('limit') ?? '100', 10);

  if (Number.isNaN(parsedLimit) || parsedLimit < 1) {
    logger.warn('analytics_events_invalid_limit', { requestId, tenantId, route: '/api/cockpit/analytics/events', limit: searchParams.get('limit') });
    return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid limit. Must be a positive integer.');
  }

  if (parsedLimit > 500) {
    logger.warn('analytics_events_invalid_limit_max', { requestId, tenantId, route: '/api/cockpit/analytics/events', limit: searchParams.get('limit') });
    return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid limit. Maximum allowed is 500.');
  }

  const filters = [eq(publicEvents.tenantId, tenantId)];

  if (event) {
    filters.push(eq(publicEvents.eventType, event));
  }

  if (anonId) {
    filters.push(eq(publicEvents.anonId, anonId));
  }

  try {
    const db = await getDb();
    const events = await db
      .select({
        id: publicEvents.id,
        event: publicEvents.eventType,
        anonId: publicEvents.anonId,
        path: sql<string>`JSON_UNQUOTE(JSON_EXTRACT(${publicEvents.payloadJson}, '$.path'))`,
        props: sql<string>`JSON_UNQUOTE(JSON_EXTRACT(${publicEvents.payloadJson}, '$.props'))`,
        userAgent: sql<string>`JSON_UNQUOTE(JSON_EXTRACT(${publicEvents.payloadJson}, '$.userAgent'))`,
        createdAt: publicEvents.createdAt,
      })
      .from(publicEvents)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(publicEvents.createdAt))
      .limit(parsedLimit);

    const payload = {
      events: events.map((item) => ({
        ...item,
        props: safeParseProps(item.props),
        userAgent: item.userAgent ? item.userAgent.slice(0, 120) : null,
      })),
    };

    logger.info('analytics_events_loaded', { requestId, tenantId, route: '/api/cockpit/analytics/events', count: payload.events.length });
    const response = NextResponse.json(payload);
    response.headers.set('x-request-id', requestId);
    return response;
  } catch (error) {
    logger.error('cockpit/analytics/events: failed to load events', error as Error, {
      requestId,
      tenantId,
      event,
      anonId,
      limit: parsedLimit,
    });

    if (isAnalyticsTableMissing(error)) {
      return errorResponse(ErrorCode.DB_ERROR, 503, requestId, 'Analytics table not migrated');
    }

    return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Failed to load analytics events');
  }
}

export const GET = withRequestTrace(handler);
