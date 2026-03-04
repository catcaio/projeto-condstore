export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { runQdrantReindex } from '@/infra/vector/qdrant-reindex';
import { requireInternalToken } from '@/infra/auth/tenant-route-guard';
import { withRequestTrace } from '@/infra/http/request-trace';

interface ReindexBody {
  tenantId?: string;
  docs?: boolean;
  chat?: boolean;
  sinceHours?: number;
  full?: boolean;
}

function isAuthorized(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  return requireInternalToken(request, { purpose: ['export', 'diag'] }).ok;
}

function parseBody(body: ReindexBody): { error: NextResponse } | { input: { tenantId: string; docs?: boolean; chat?: boolean; sinceHours?: number; full: boolean } } {
  const tenantId = String(body?.tenantId || '').trim();
  if (!tenantId) {
    return { error: NextResponse.json({ error: 'tenantId is required' }, { status: 400 }) };
  }

  const sinceHours = typeof body?.sinceHours === 'number'
    ? Math.max(1, Math.trunc(body.sinceHours))
    : undefined;

  return {
    input: {
      tenantId,
      docs: typeof body?.docs === 'boolean' ? body.docs : undefined,
      chat: typeof body?.chat === 'boolean' ? body.chat : undefined,
      sinceHours,
      full: body?.full === true,
    },
  };
}

async function handler(request: NextRequest): Promise<NextResponse> {

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: ReindexBody;
  try {
    body = (await request.json()) as ReindexBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseBody(body);
  if ('error' in parsed) return parsed.error;

  try {
    const summary = await runQdrantReindex(parsed.input);
    return NextResponse.json({ ok: true, ...summary, timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export const POST = withRequestTrace(handler);
