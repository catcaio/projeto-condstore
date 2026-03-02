import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import { requireAdmin } from '@/infra/auth/guards';
import { publicEvents } from '../../../../../drizzle/schema';
import { requireActivePlan } from '../../../../../modules/billing/requireActivePlan';
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(request);
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
    return NextResponse.json({ error: 'Invalid limit. Must be a positive integer.' }, { status: 400 });
  }

  if (parsedLimit > 500) {
    return NextResponse.json({ error: 'Invalid limit. Maximum allowed is 500.' }, { status: 400 });
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

    return NextResponse.json({
      events: events.map((item) => ({
        ...item,
        props: safeParseProps(item.props),
        userAgent: item.userAgent ? item.userAgent.slice(0, 120) : null,
      })),
    });
  } catch (error) {
    logger.error('cockpit/analytics/events: failed to load events', error as Error, {
      tenantId,
      event,
      anonId,
      limit: parsedLimit,
    });

    if (isAnalyticsTableMissing(error)) {
      return NextResponse.json({ error: 'Analytics table not migrated' }, { status: 503 });
    }

    return NextResponse.json({ error: 'Failed to load analytics events' }, { status: 500 });
  }
}
