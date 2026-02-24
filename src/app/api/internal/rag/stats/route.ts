export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { frankEvents } from '@/drizzle/schema';
import { getDb } from '@/infra/db';
import { countPoints, getQdrantCollectionName } from '@/infra/vector/qdrant.client';

function parseEnabledTenants(): string[] {
  return String(process.env.RAG_ENABLED_TENANTS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseConfig() {
  return {
    RAG_ENABLED_DEFAULT: String(process.env.RAG_ENABLED_DEFAULT || 'false'),
    RAG_ENABLED_TENANTS: parseEnabledTenants(),
    RAG_DOCS_MAX_CHUNKS: Number.parseInt(process.env.RAG_DOCS_MAX_CHUNKS || '3', 10) || 3,
    RAG_CHAT_MAX_CHUNKS: Number.parseInt(process.env.RAG_CHAT_MAX_CHUNKS || '2', 10) || 2,
    RAG_DOCS_MIN_SCORE: Number.parseFloat(process.env.RAG_DOCS_MIN_SCORE || process.env.RAG_MIN_SCORE || '0.75') || 0.75,
    RAG_CHAT_MIN_SCORE: Number.parseFloat(process.env.RAG_CHAT_MIN_SCORE || process.env.RAG_MIN_SCORE || '0.75') || 0.75,
    RAG_MIN_AVG_SCORE: Number.parseFloat(process.env.RAG_MIN_AVG_SCORE || '0.78') || 0.78,
    RAG_MAX_CONTEXT_CHARS: Number.parseInt(process.env.RAG_MAX_CONTEXT_CHARS || '1500', 10) || 1500,
    qdrantCollection: getQdrantCollectionName(),
  };
}

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim();
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const [eventCountRow] = await db
      .select({ total: sql<number>`count(*)` })
      .from(frankEvents)
      .where(eq(frankEvents.tenantId, tenantId));

    const collection = getQdrantCollectionName();
    const qdrantCount = await countPoints(collection, {
      must: [
        {
          key: 'tenant_id',
          match: { value: tenantId },
        },
      ],
    });
    const qdrantBody = (qdrantCount.body ?? {}) as { result?: { count?: number } };
    const pointsCount = qdrantBody?.result?.count ?? 0;

    return NextResponse.json({
      ok: true,
      tenantId,
      eventsCount: Number(eventCountRow?.total ?? 0),
      pointsCount,
      ragConfig: parseConfig(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        tenantId,
        error: error instanceof Error ? error.message : String(error),
        ragConfig: parseConfig(),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
