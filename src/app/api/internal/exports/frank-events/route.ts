import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { frankEvents } from '@/drizzle/schema';
import { getDb } from '@/infra/db';
import { logger } from '@/infra/logger';
import { sanitizeFrankPayload } from '@/core/ai/frank-event-sanitize';
import { requireInternalToken } from '@/infra/auth/tenant-route-guard';
import { makeRequestId } from '@/infra/http/request-trace';
import { applyFrankInternalRateLimit } from '@/infra/security/frank-rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 5000;
const MAX_LIMIT = 10000;
const CHUNK_SIZE = 500;
const DEFAULT_DATASET_VERSION = 'frank-events/v1';
const EXPORT_FAILED_CODE = 'export_failed';

type ExportSelectMode = 'full' | 'legacy_no_rag';

type ExportRow = {
  tenant_id: string;
  session_id: string | null;
  correlation_id: string | null;
  kind: string;
  model: string | null;
  provider: string | null;
  latency_ms: number | null;
  tokens_prompt: number | null;
  tokens_completion: number | null;
  rag_used?: number | null;
  rag_chunks?: number | null;
  rag_latency_ms?: number | null;
  created_at: Date | string;
  payload_json: unknown;
  id: string;
};

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}


function parseDateParam(value: string | null | undefined, field: 'from' | 'to'): Date | undefined | NextResponse {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw || raw === '-') return undefined;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ ok: false, error: 'invalid_date', field }, { status: 400 });
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

function errorToLogCause(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { value: String(error) };
  const cause = (error as { cause?: unknown }).cause;
  const serialized: Record<string, unknown> = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
  if (cause instanceof Error) {
    serialized.cause = {
      name: cause.name,
      message: cause.message,
      stack: cause.stack,
      ...(typeof (cause as { code?: unknown }).code !== 'undefined'
        ? { code: (cause as { code?: unknown }).code }
        : {}),
    };
  } else if (typeof cause !== 'undefined') {
    serialized.cause = String(cause);
  }
  return serialized;
}

function isLegacyFrankEventsSchemaError(error: unknown): boolean {
  const messages: string[] = [];
  if (error instanceof Error) {
    messages.push(error.message);
    const cause = (error as { cause?: unknown }).cause;
    if (cause instanceof Error) messages.push(cause.message);
    else if (typeof cause !== 'undefined') messages.push(String(cause));
  } else {
    messages.push(String(error));
  }
  const text = messages.join('\n');
  return /unknown column/i.test(text) && /(rag_used|rag_chunks|rag_latency_ms)/i.test(text);
}

async function selectFrankEventsBatch(
  db: Awaited<ReturnType<typeof getDb>>,
  {
    tenantId,
    from,
    to,
    limit,
    offset,
    mode,
  }: {
    tenantId: string;
    from?: Date;
    to?: Date;
    limit: number;
    offset: number;
    mode: ExportSelectMode;
  },
): Promise<ExportRow[]> {
  const conditions = [eq(frankEvents.tenantId, tenantId)];
  if (from) conditions.push(gte(frankEvents.createdAt, from));
  if (to) conditions.push(lte(frankEvents.createdAt, to));
  const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

  if (mode === 'legacy_no_rag') {
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
        created_at: frankEvents.createdAt,
        payload_json: frankEvents.payloadJson,
        id: frankEvents.id,
      })
      .from(frankEvents)
      .where(whereClause)
      .orderBy(asc(frankEvents.createdAt), asc(frankEvents.id))
      .limit(limit)
      .offset(offset);
    return rows as ExportRow[];
  }

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
    .where(whereClause)
    .orderBy(asc(frankEvents.createdAt), asc(frankEvents.id))
    .limit(limit)
    .offset(offset);

  return rows as ExportRow[];
}

async function selectFrankEventsBatchWithFallback(
  db: Awaited<ReturnType<typeof getDb>>,
  params: {
    tenantId: string;
    from?: Date;
    to?: Date;
    limit: number;
    offset: number;
    mode: ExportSelectMode;
    requestId: string;
  },
): Promise<{ rows: ExportRow[]; mode: ExportSelectMode }> {
  try {
    const rows = await selectFrankEventsBatch(db, params);
    return { rows, mode: params.mode };
  } catch (error) {
    if (params.mode === 'full' && isLegacyFrankEventsSchemaError(error)) {
      logger.warn('frank_events_export_legacy_schema_fallback', {
        requestId: params.requestId,
        tenantId: params.tenantId,
        offset: params.offset,
        limit: params.limit,
      }, error as Error);
      const rows = await selectFrankEventsBatch(db, { ...params, mode: 'legacy_no_rag' });
      return { rows, mode: 'legacy_no_rag' };
    }
    throw error;
  }
}

function serializeFrankRowToNdjson(
  row: ExportRow,
  {
    datasetVersion,
    appVersion,
    modelId,
    embedModelId,
  }: {
    datasetVersion: string;
    appVersion: string;
    modelId: string | null;
    embedModelId: string | null;
  },
): string {
  return `${JSON.stringify({
    tenant_id: row.tenant_id,
    session_id: row.session_id,
    correlation_id: row.correlation_id,
    kind: row.kind,
    model: row.model,
    provider: row.provider,
    latency_ms: row.latency_ms,
    tokens_prompt: typeof row.tokens_prompt === 'number' ? row.tokens_prompt : 0,
    tokens_completion: typeof row.tokens_completion === 'number' ? row.tokens_completion : 0,
    rag_used: typeof row.rag_used === 'number' ? row.rag_used : 0,
    rag_chunks: typeof row.rag_chunks === 'number' ? row.rag_chunks : 0,
    rag_latency_ms: typeof row.rag_latency_ms === 'number' ? row.rag_latency_ms : 0,
    dataset_version: datasetVersion,
    app_version: appVersion,
    model_id: row.model ?? modelId,
    embed_model_id: embedModelId,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(String(row.created_at)).toISOString(),
    payload_json: sanitizeFrankPayload(row.payload_json),
  })}\n`;
}

export async function GET(request: NextRequest) {
  const requestId = makeRequestId(request);
  const startTime = Date.now();

  logger.info('api_request_start', {
    requestId,
    method: 'GET',
    path: '/api/internal/exports/frank-events',
  });

  const authResult = requireInternalToken(request, { purpose: ['export', 'diag'] });
  if (!authResult.ok) {
    const response = NextResponse.json({ ok: false, error: 'Unauthorized', requestId }, { status: 401 });
    response.headers.set('X-Request-Id', requestId);
    return response;
  }

  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim();
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: 'tenantId is required', requestId }, { status: 400 });
  }

  const rl = await applyFrankInternalRateLimit({ tenantId, requestId, route: '/api/internal/exports/frank-events' });
  if (rl.blocked) return rl.response;

  const fromParsed = parseDateParam(request.nextUrl.searchParams.get('from'), 'from');
  if (fromParsed instanceof NextResponse) return fromParsed;
  const toParsed = parseDateParam(request.nextUrl.searchParams.get('to'), 'to');
  if (toParsed instanceof NextResponse) return toParsed;

  if (fromParsed && toParsed && fromParsed > toParsed) {
    return NextResponse.json({ ok: false, error: 'invalid_date_range', requestId }, { status: 400 });
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
  let db: Awaited<ReturnType<typeof getDb>>;
  let initialMode: ExportSelectMode = 'full';
  let initialRows: ExportRow[] = [];
  let initialChunk = '';
  let initialExported = 0;
  let initialOffset = 0;

  try {
    db = await getDb();
    const firstBatchSize = Math.min(CHUNK_SIZE, limit);
    const firstBatch = await selectFrankEventsBatchWithFallback(db, {
      tenantId,
      from: fromParsed ?? undefined,
      to: toParsed ?? undefined,
      limit: firstBatchSize,
      offset: 0,
      mode: initialMode,
      requestId,
    });
    initialMode = firstBatch.mode;
    initialRows = firstBatch.rows;
    if (initialRows.length > 0) {
      initialChunk = initialRows
        .map((row) =>
          serializeFrankRowToNdjson(row, { datasetVersion, appVersion, modelId, embedModelId }),
        )
        .join('');
      initialExported = initialRows.length;
      initialOffset = initialRows.length;
    }
  } catch (error) {
    logger.error('frank_events_export_failed', error as Error, {
      requestId,
      tenantId,
      from: fromParsed?.toISOString(),
      to: toParsed?.toISOString(),
      limit,
      offset: 0,
      exported: 0,
      phase: 'initial_batch',
      cause: errorToLogCause(error),
    });
    return NextResponse.json({ ok: false, error: EXPORT_FAILED_CODE, requestId }, { status: 500 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let exported = 0;
      let offset = 0;
      let wroteAny = false;
      let selectMode = initialMode;

      try {
        if (initialChunk) {
          controller.enqueue(encoder.encode(initialChunk));
          wroteAny = true;
          exported = initialExported;
          offset = initialOffset;
          if (exported >= limit) {
            controller.close();
            return;
          }
          if (initialRows.length < Math.min(CHUNK_SIZE, limit)) {
            controller.close();
            return;
          }
        } else {
          controller.close();
          return;
        }

        while (exported < limit) {
          const batchSize = Math.min(CHUNK_SIZE, limit - exported);
          const batch = await selectFrankEventsBatchWithFallback(db, {
            tenantId,
            from: fromParsed ?? undefined,
            to: toParsed ?? undefined,
            limit: batchSize,
            offset,
            mode: selectMode,
            requestId,
          });
          selectMode = batch.mode;
          if (batch.rows.length === 0) break;

          for (const row of batch.rows) {
            controller.enqueue(
              encoder.encode(
                serializeFrankRowToNdjson(row, { datasetVersion, appVersion, modelId, embedModelId }),
              ),
            );
            wroteAny = true;
            exported += 1;
            if (exported >= limit) break;
          }

          offset += batch.rows.length;
          if (batch.rows.length < batchSize) break;
        }

        controller.close();
      } catch (error) {
        logger.error('frank_events_export_failed', error as Error, {
          requestId,
          tenantId,
          from: fromParsed?.toISOString(),
          to: toParsed?.toISOString(),
          limit,
          offset,
          exported,
          phase: 'streaming',
          wroteAny,
          selectMode,
          cause: errorToLogCause(error),
        });

        try {
          if (wroteAny) {
            controller.enqueue(
              encoder.encode(`${JSON.stringify({ ok: false, error: EXPORT_FAILED_CODE, requestId })}\n`),
            );
          }
          controller.close();
        } catch {
          // Swallow stream controller errors to avoid bubbling an uncaught exception.
        }
      }
    },
  });

  const latencyMs = Date.now() - startTime;
  logger.info('api_request_end', {
    requestId,
    status: 200,
    latencyMs,
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Request-Id': requestId,
    },
  });
}
