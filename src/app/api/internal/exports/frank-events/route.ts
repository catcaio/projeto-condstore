import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { frankEvents } from '@/drizzle/schema';
import { getDb } from '@/infra/db';
import { logger } from '@/infra/logger';
import { sanitizeFrankPayload } from '@/core/ai/frank-event-sanitize';
import { getInternalExportTokenOrThrow, isInternalTokenAuthorized } from '@/infra/config/internal-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 5000;
const MAX_LIMIT = 10000;
const CHUNK_SIZE = 500;
const DEFAULT_DATASET_VERSION = 'frank-events/v1';

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseDateParam(value: string | null, field: 'from' | 'to'): Date | null | NextResponse {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: `Invalid ${field}. Expected ISO-8601 datetime.` }, { status: 400 });
  }
  return date;
}

function parseLimitParam(value: string | null): number | NextResponse {
  if (!value) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return NextResponse.json({ error: 'Invalid limit. Must be a positive integer.' }, { status: 400 });
  }
  return Math.min(parsed, MAX_LIMIT);
}

export async function GET(request: NextRequest) {
  try {
    getInternalExportTokenOrThrow();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'INTERNAL_EXPORT_TOKEN not configured' },
      { status: 500 },
    );
  }
  const token = request.headers.get('x-internal-token');
  if (!isInternalTokenAuthorized(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim();
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
  }

  const fromParsed = parseDateParam(request.nextUrl.searchParams.get('from'), 'from');
  if (fromParsed instanceof NextResponse) return fromParsed;
  const toParsed = parseDateParam(request.nextUrl.searchParams.get('to'), 'to');
  if (toParsed instanceof NextResponse) return toParsed;

  if (fromParsed && toParsed && fromParsed > toParsed) {
    return NextResponse.json({ error: '`from` must be <= `to`' }, { status: 400 });
  }

  const limitParsed = parseLimitParam(request.nextUrl.searchParams.get('limit'));
  if (limitParsed instanceof NextResponse) return limitParsed;
  const limit = limitParsed;
  const datasetVersion =
    normalizeOptionalString(request.nextUrl.searchParams.get('datasetVersion')) ??
    normalizeOptionalString(process.env.DATASET_VERSION) ??
    DEFAULT_DATASET_VERSION;
  const appVersion =
    normalizeOptionalString(request.nextUrl.searchParams.get('appVersion')) ??
    normalizeOptionalString(process.env.APP_VERSION) ??
    normalizeOptionalString(process.env.VERCEL_GIT_COMMIT_SHA) ??
    'unknown';
  const modelId =
    normalizeOptionalString(request.nextUrl.searchParams.get('modelId')) ??
    normalizeOptionalString(process.env.DEFAULT_LMSTUDIO_MODEL);
  const embedModelId =
    normalizeOptionalString(request.nextUrl.searchParams.get('embedModelId')) ??
    normalizeOptionalString(process.env.DEFAULT_EMBED_MODEL);

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let exported = 0;
      let offset = 0;

      try {
        const db = await getDb();

        while (exported < limit) {
          const batchSize = Math.min(CHUNK_SIZE, limit - exported);
          const conditions = [eq(frankEvents.tenantId, tenantId)];
          if (fromParsed) conditions.push(gte(frankEvents.createdAt, fromParsed));
          if (toParsed) conditions.push(lte(frankEvents.createdAt, toParsed));

          const rows = await db
            .select({
              tenant_id: frankEvents.tenantId,
              session_id: frankEvents.sessionId,
              correlation_id: frankEvents.correlationId,
              kind: frankEvents.kind,
              model: frankEvents.model,
              provider: frankEvents.provider,
              latency_ms: frankEvents.latencyMs,
              tokens_prompt: frankEvents.tokensPrompt,
              tokens_completion: frankEvents.tokensCompletion,
              rag_used: frankEvents.ragUsed,
              rag_chunks: frankEvents.ragChunks,
              rag_latency_ms: frankEvents.ragLatencyMs,
              created_at: frankEvents.createdAt,
              payload_json: frankEvents.payloadJson,
              id: frankEvents.id,
            })
            .from(frankEvents)
            .where(conditions.length === 1 ? conditions[0] : and(...conditions))
            .orderBy(asc(frankEvents.createdAt), asc(frankEvents.id))
            .limit(batchSize)
            .offset(offset);

          if (rows.length === 0) break;

          for (const row of rows) {
            const line = JSON.stringify({
              tenant_id: row.tenant_id,
              session_id: row.session_id,
              correlation_id: row.correlation_id,
              kind: row.kind,
              model: row.model,
              provider: row.provider,
              latency_ms: row.latency_ms,
              tokens_prompt: row.tokens_prompt,
              tokens_completion: row.tokens_completion,
              rag_used: row.rag_used,
              rag_chunks: row.rag_chunks,
              rag_latency_ms: row.rag_latency_ms,
              dataset_version: datasetVersion,
              app_version: appVersion,
              model_id: row.model ?? modelId,
              embed_model_id: embedModelId,
              created_at: row.created_at instanceof Date
                ? row.created_at.toISOString()
                : new Date(String(row.created_at)).toISOString(),
              payload_json: sanitizeFrankPayload(row.payload_json),
            }) + '\n';

            controller.enqueue(encoder.encode(line));
            exported += 1;
            if (exported >= limit) break;
          }

          offset += rows.length;
          if (rows.length < batchSize) break;
        }

        controller.close();
      } catch (error) {
        logger.error('frank_events export failed', error as Error, {
          tenantId,
          from: fromParsed?.toISOString(),
          to: toParsed?.toISOString(),
          limit,
          offset,
          exported,
        });
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
