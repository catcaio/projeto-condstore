export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { runQdrantReindex } from '@/infra/vector/qdrant-reindex';

interface ReindexBody {
  tenantId?: string;
  docs?: boolean;
  chat?: boolean;
  sinceHours?: number;
  full?: boolean;
}

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.INTERNAL_EXPORT_TOKEN;
  const token = request.headers.get('x-internal-token');
  return Boolean(expected && token && token === expected);
}

function parseBody(body: ReindexBody) {
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

export async function POST(request: NextRequest) {
  if (!process.env.INTERNAL_EXPORT_TOKEN) {
    return NextResponse.json({ error: 'INTERNAL_EXPORT_TOKEN not configured' }, { status: 500 });
  }
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
