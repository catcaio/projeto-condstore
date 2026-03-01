import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { embed } from '@/infra/ai/embeddings.client';
import { getDb } from '@/infra/db';
import { frankEvents } from '@/drizzle/schema';
import { getQdrantCollectionName, searchPoints } from '@/infra/vector/qdrant.client';
import { endUserConsentRepository } from '@/infra/repositories/end-user-consent.repository';
import { structuredLogger } from '@/infra/log/logger';

export type RetrievedChunk = {
  score: number;
  text: string;
  meta: {
    event_id: string;
    created_at: string;
    correlation_id?: string;
    route?: string;
    source?: string;
    path?: string;
    chunk_index?: number;
  };
};

interface RetrieveContextInput {
  tenantId: string;
  query: string;
  limit?: number;
}

type RetrieveContextResult = {
  query: string;
  chunks: RetrievedChunk[];
  cacheHit?: boolean;
};

interface RetrieveContextMultiInput {
  tenantId: string;
  query: string;
  docsLimit?: number;
  chatLimit?: number;
  phoneHash?: string;
}

export type RetrieveContextMultiResult = {
  query: string;
  docs: RetrievedChunk[];
  chat: RetrievedChunk[];
  chunks: RetrievedChunk[];
  cacheHit?: boolean;
};

interface QdrantSearchItem {
  score?: number;
  payload?: Record<string, unknown>;
}

interface QdrantSearchBody {
  result?: QdrantSearchItem[];
}

const RETRIEVE_CACHE_TTL_MS = 60_000;
const retrieveCache = new Map<string, { expiresAt: number; chunks: RetrievedChunk[]; maxLimit: number }>();

function truncateText(text: string, maxLen = 4000): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}...[truncated]`;
}

function normalizeQuery(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 512);
}

function queryHash(text: string): string {
  return createHash('sha1').update(text).digest('hex');
}

function getCacheKey(tenantId: string, normalizedQuery: string): string {
  return `${tenantId}:${queryHash(normalizedQuery)}`;
}

function getDateKey(createdAtIso: string): string {
  return createdAtIso.slice(0, 10);
}

function getEventPrefix(eventId: string): string {
  return eventId.split('-')[0] || eventId.slice(0, 8);
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function applySimpleDiversity(chunks: RetrievedChunk[], limit: number): RetrievedChunk[] {
  const byCorrelation = new Set<string>();
  const byEventPrefix = new Set<string>();
  const byDate = new Set<string>();
  const selected: RetrievedChunk[] = [];

  for (const chunk of chunks) {
    if (selected.length >= limit) break;

    const correlationId = chunk.meta.correlation_id?.trim();
    if (correlationId) {
      if (byCorrelation.has(correlationId)) continue;
      byCorrelation.add(correlationId);
      selected.push(chunk);
      continue;
    }

    const eventPrefix = isUuidLike(chunk.meta.event_id) ? '' : getEventPrefix(chunk.meta.event_id);
    if (eventPrefix) {
      if (byEventPrefix.has(eventPrefix)) continue;
      byEventPrefix.add(eventPrefix);
      selected.push(chunk);
      continue;
    }

    const day = getDateKey(chunk.meta.created_at);
    if (byDate.has(day)) continue;
    byDate.add(day);
    selected.push(chunk);
  }

  return selected;
}

function isRepoChunk(chunk: RetrievedChunk): boolean {
  return chunk.meta.source === 'repo';
}

function splitChannels(chunks: RetrievedChunk[]) {
  const docs: RetrievedChunk[] = [];
  const chat: RetrievedChunk[] = [];
  for (const chunk of chunks) {
    if (isRepoChunk(chunk)) {
      docs.push(chunk);
    } else {
      chat.push(chunk);
    }
  }
  return { docs, chat };
}

function normalizePayload(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function textFromPayload(payload: Record<string, unknown>): string {
  const direct = typeof payload.text === 'string' ? payload.text : '';
  if (direct.trim()) return truncateText(direct.trim(), 4000);

  const systemText = typeof payload.systemText === 'string' ? payload.systemText : '';
  const userText = typeof payload.userText === 'string' ? payload.userText : '';
  const assistantText = typeof payload.assistantText === 'string' ? payload.assistantText : '';
  const joined = [systemText, userText, assistantText]
    .filter((p) => p && p.trim())
    .join('\n')
    .trim();
  return truncateText(joined, 4000);
}

async function loadFrankEventText(tenantId: string, eventId: string): Promise<{ text: string; route?: string } | null> {
  if (!tenantId || !eventId) return null;

  const db = await getDb();
  const [row] = await db
    .select({
      payloadJson: frankEvents.payloadJson,
    })
    .from(frankEvents)
    .where(and(eq(frankEvents.tenantId, tenantId), eq(frankEvents.id, eventId)))
    .limit(1);

  if (!row) return null;

  const payload = normalizePayload(row.payloadJson);
  const text = textFromPayload(payload);
  const route = typeof payload.route === 'string' ? payload.route : undefined;
  return text ? { text, route } : null;
}

function asIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(String(value)).toISOString();
}

export async function retrieveContext(
  input: RetrieveContextInput,
): Promise<RetrieveContextResult> {
  const tenantId = input.tenantId?.trim();
  const query = input.query?.trim();
  const limit = Math.max(1, Math.min(20, input.limit ?? 5));

  if (!tenantId) throw new Error('tenantId is required');
  if (!query) throw new Error('query is required');

  const base = await retrieveContextRaw({ tenantId, query, limit });
  const deduped = applySimpleDiversity(base.chunks, limit);
  return { query, chunks: deduped, cacheHit: base.cacheHit };
}

async function retrieveContextRaw(
  input: RetrieveContextInput,
): Promise<RetrieveContextResult> {
  const tenantId = input.tenantId?.trim();
  const query = input.query?.trim();
  const limit = Math.max(1, Math.min(40, input.limit ?? 5));

  if (!tenantId) throw new Error('tenantId is required');
  if (!query) throw new Error('query is required');

  const normalizedQuery = normalizeQuery(query);
  const cacheKey = getCacheKey(tenantId, normalizedQuery);
  const now = Date.now();
  const cached = retrieveCache.get(cacheKey);
  if (cached && cached.expiresAt > now && cached.maxLimit >= limit) {
    return {
      query,
      chunks: cached.chunks.slice(0, limit),
      cacheHit: true,
    };
  }
  if (cached && cached.expiresAt <= now) {
    retrieveCache.delete(cacheKey);
  }

  const [queryVector] = await embed([normalizedQuery]);
  if (!queryVector) {
    return { query, chunks: [], cacheHit: false };
  }

  const collection = getQdrantCollectionName();
  const searchLimit = Math.max(limit, Math.min(limit * 4, 40));
  const search = await searchPoints(
    collection,
    queryVector,
    {
      must: [
        {
          key: 'tenant_id',
          match: { value: tenantId },
        },
      ],
    },
    searchLimit,
  );

  const body = (search.body ?? {}) as QdrantSearchBody;
  const results = Array.isArray(body.result) ? body.result : [];
  const chunks: RetrievedChunk[] = [];

  for (const item of results) {
    const payload = normalizePayload(item.payload);
    const source = typeof payload.source === 'string' ? payload.source : undefined;
    const pathValue = typeof payload.path === 'string' ? payload.path : undefined;
    const chunkIndex = typeof payload.chunk_index === 'number' ? payload.chunk_index : undefined;
    const syntheticEventId = pathValue
      ? `repo:${pathValue}:${typeof chunkIndex === 'number' ? chunkIndex : 0}`
      : '';
    const eventId = typeof payload.event_id === 'string' ? payload.event_id : syntheticEventId;
    const createdAtRaw = payload.created_at;
    const correlationId = typeof payload.correlation_id === 'string' ? payload.correlation_id : undefined;
    let route = typeof payload.route === 'string' ? payload.route : undefined;

    let text = textFromPayload(payload);
    if (!text && eventId && !(source === 'repo')) {
      const fallback = await loadFrankEventText(tenantId, eventId);
      if (fallback?.text) {
        text = fallback.text;
      }
      if (!route && fallback?.route) {
        route = fallback.route;
      }
    }

    if (!eventId || !createdAtRaw || !text) {
      continue;
    }

    chunks.push({
      score: typeof item.score === 'number' ? item.score : 0,
      text,
      meta: {
        event_id: eventId,
        created_at: asIso(createdAtRaw),
        ...(correlationId ? { correlation_id: correlationId } : {}),
        ...(route ? { route } : {}),
        ...(source ? { source } : {}),
        ...(pathValue ? { path: pathValue } : {}),
        ...(typeof chunkIndex === 'number' ? { chunk_index: chunkIndex } : {}),
      },
    });
  }

  retrieveCache.set(cacheKey, {
    expiresAt: now + RETRIEVE_CACHE_TTL_MS,
    chunks,
    maxLimit: searchLimit,
  });

  return { query, chunks: chunks.slice(0, limit), cacheHit: false };
}

export async function retrieveContextMulti(
  input: RetrieveContextMultiInput,
): Promise<RetrieveContextMultiResult> {
  const tenantId = input.tenantId?.trim();
  const query = input.query?.trim();
  const docsLimit = Math.max(0, Math.min(10, input.docsLimit ?? 3));
  const chatLimit = Math.max(0, Math.min(10, input.chatLimit ?? 2));

  if (!tenantId) throw new Error('tenantId is required');
  if (!query) throw new Error('query is required');

  if (input.phoneHash) {
    const consent = await endUserConsentRepository.getConsent(tenantId, input.phoneHash);
    if (!consent || !consent.consentGiven) {
      await endUserConsentRepository.incrementBlockedAttempts(tenantId, input.phoneHash);
      structuredLogger.warn('lgpd_retrieval_blocked', {
        tenantId,
        phoneHash: input.phoneHash,
        reason: 'missing_consent',
        eventType: 'lgpd_retrieval_blocked',
      });
      return {
        query,
        docs: [],
        chat: [],
        chunks: [],
        cacheHit: false,
      };
    }
  }

  const totalDesired = Math.max(1, docsLimit + chatLimit);
  const base = await retrieveContextRaw({ tenantId, query, limit: totalDesired });
  const { docs, chat } = splitChannels(base.chunks);
  const docsSelected = docsLimit > 0 ? applySimpleDiversity(docs, docsLimit) : [];
  const chatSelected = chatLimit > 0 ? applySimpleDiversity(chat, chatLimit) : [];

  return {
    query,
    docs: docsSelected,
    chat: chatSelected,
    chunks: [...docsSelected, ...chatSelected],
    cacheHit: base.cacheHit,
  };
}
