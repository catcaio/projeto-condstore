import crypto from 'node:crypto';
import mysql from 'mysql2/promise';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = 'true';
    }
  }
  return out;
}

function getEnv(name, fallback) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

function parseDateOrNull(value, label) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return d;
}

function truncateText(text, maxLen) {
  if (typeof text !== 'string') return '';
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}...[truncated]`;
}

function normalizePayload(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') return raw;
  return {};
}

function buildChunkFromPayload(payload) {
  const systemText = typeof payload.systemText === 'string' ? payload.systemText : '';
  const userText = typeof payload.userText === 'string' ? payload.userText : '';
  const assistantText = typeof payload.assistantText === 'string' ? payload.assistantText : '';

  const joined = [systemText, userText, assistantText]
    .filter((part) => part && part.trim())
    .join('\n')
    .trim();

  return {
    systemText,
    userText,
    assistantText,
    text: truncateText(joined, 4000),
    route: typeof payload.route === 'string' ? payload.route : null,
  };
}

function sha1Hex(value) {
  return crypto.createHash('sha1').update(value).digest('hex');
}

function sha1ToDeterministicUuid(sha1) {
  const hex = String(sha1).replace(/[^a-fA-F0-9]/g, '').toLowerCase();
  const base = (hex.length >= 32 ? hex.slice(0, 32) : hex.padEnd(32, '0')).split('');
  // Mark as UUIDv5-like (deterministic from SHA-1) for compatibility with validators.
  base[12] = '5';
  const variantNibble = parseInt(base[16], 16);
  base[16] = ((variantNibble & 0x3) | 0x8).toString(16);
  const h = base.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

function qdrantHeaders(hasBody) {
  const headers = {};
  if (hasBody) headers['content-type'] = 'application/json';
  const apiKey = process.env.QDRANT_API_KEY?.trim();
  if (apiKey) headers['api-key'] = apiKey;
  return headers;
}

async function qdrantRequest(baseUrl, path, { method = 'GET', body } = {}) {
  const hasBody = body !== undefined;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: qdrantHeaders(hasBody),
    body: hasBody ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  const text = await res.text().catch(() => '');
  let parsed = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  if (!res.ok) {
    throw new Error(`Qdrant ${method} ${path} failed (${res.status}): ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`);
  }
  return parsed;
}

async function ensureCollection(qdrantUrl, collection) {
  try {
    await qdrantRequest(qdrantUrl, `/collections/${encodeURIComponent(collection)}`, { method: 'GET' });
    return { ensured: false };
  } catch (err) {
    if (!String(err.message || err).includes('(404)')) throw err;
  }

  try {
    await qdrantRequest(qdrantUrl, `/collections/${encodeURIComponent(collection)}`, {
      method: 'PUT',
      body: {
        vectors: { size: 768, distance: 'Cosine' },
      },
    });
    return { ensured: true };
  } catch (err) {
    if (String(err.message || err).includes('(409)')) {
      return { ensured: false };
    }
    throw err;
  }
}

async function upsertPoints(qdrantUrl, collection, points) {
  const path = `/collections/${encodeURIComponent(collection)}/points?wait=true`;
  try {
    return await qdrantRequest(qdrantUrl, path, {
      method: 'POST',
      body: { points },
    });
  } catch (err) {
    // Some Qdrant versions require PUT for the same payload shape.
    if (!String(err?.message ?? err).includes('(400)')) throw err;
    return qdrantRequest(qdrantUrl, path, {
      method: 'PUT',
      body: { points },
    });
  }
}

async function searchPoints(qdrantUrl, collection, vector, tenantId, limit = 3) {
  return qdrantRequest(qdrantUrl, `/collections/${encodeURIComponent(collection)}/points/search`, {
    method: 'POST',
    body: {
      vector,
      limit,
      with_payload: true,
      filter: {
        must: [
          {
            key: 'tenant_id',
            match: { value: tenantId },
          },
        ],
      },
    },
  });
}

async function getCollectionInfo(qdrantUrl, collection) {
  return qdrantRequest(qdrantUrl, `/collections/${encodeURIComponent(collection)}`, { method: 'GET' });
}

async function embedBatch(baseUrl, model, texts) {
  const headers = { 'content-type': 'application/json' };
  const apiKey = process.env.LMSTUDIO_API_KEY || process.env.OPENAI_API_KEY;
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;

  const res = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      input: texts,
    }),
    signal: AbortSignal.timeout(30000),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Embeddings failed (${res.status}): ${text.slice(0, 500)}`);
  }

  const body = JSON.parse(text);
  const vectors = (body?.data ?? []).map((it) => it?.embedding).filter(Array.isArray);
  if (vectors.length !== texts.length) {
    throw new Error(`Embeddings count mismatch: expected ${texts.length}, got ${vectors.length}`);
  }
  return vectors;
}

async function embedTexts(embedBaseUrl, embedModel, texts, batchSize = 32) {
  const all = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const vectors = await embedBatch(embedBaseUrl, embedModel, batch);
    all.push(...vectors);
  }
  return all;
}

function toIso(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(String(value)).toISOString();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const tenantId = args.tenantId || 'lojacond-default';
  const from = parseDateOrNull(args.from, 'from');
  const to = parseDateOrNull(args.to, 'to');
  const limit = Math.max(1, Number.parseInt(args.limit || '500', 10) || 500);
  const collection = args.collection || getEnv('QDRANT_COLLECTION', 'condstore_docs');
  const qdrantUrl = getEnv('QDRANT_URL', 'http://127.0.0.1:6333').replace(/\/$/, '');
  const embedBaseUrl = getEnv('DEFAULT_LMSTUDIO_BASE_URL', 'http://127.0.0.1:1234/v1').replace(/\/$/, '');
  const embedModel = args.embedModel || getRequiredEnv('DEFAULT_EMBED_MODEL');
  const searchQuery = args.searchQuery || null;
  const searchLimit = Math.max(1, Number.parseInt(args.searchLimit || '3', 10) || 3);

  if (from && to && from > to) {
    throw new Error('`from` must be <= `to`');
  }

  const dbUrl = getRequiredEnv('DATABASE_URL');

  console.log('INGEST_CONFIG', JSON.stringify({
    tenantId,
    from: from?.toISOString() ?? null,
    to: to?.toISOString() ?? null,
    limit,
    collection,
    qdrantUrl,
    embedBaseUrl,
    embedModel,
    searchQuery,
    searchLimit,
  }, null, 2));

  const conn = await mysql.createConnection({
    uri: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  const ensure = await ensureCollection(qdrantUrl, collection);
  console.log('QDRANT_COLLECTION_READY', JSON.stringify({ collection, ensured: ensure.ensured }, null, 2));

  try {
    const where = ['tenant_id = ?'];
    const params = [tenantId];
    if (from) {
      where.push('created_at >= ?');
      params.push(from);
    }
    if (to) {
      where.push('created_at <= ?');
      params.push(to);
    }
    const sql = `
      SELECT
        id,
        tenant_id,
        correlation_id,
        kind,
        created_at,
        payload_json
      FROM frank_events
      WHERE ${where.join(' AND ')}
      ORDER BY created_at ASC, id ASC
      LIMIT ${limit}
    `;

    const [rows] = await conn.execute(sql, params);
    const candidates = [];
    let skippedMissingSanitized = 0;

    for (const row of rows) {
      const payload = normalizePayload(row.payload_json);
      const chunk = buildChunkFromPayload(payload);

      if (!chunk.text) {
        skippedMissingSanitized += 1;
        continue;
      }

      const pointId = sha1ToDeterministicUuid(sha1Hex(`${row.tenant_id}:${row.id}`));
      candidates.push({
        row,
        payload,
        chunk,
        pointId,
      });
    }

    console.log('INGEST_SOURCE', JSON.stringify({
      selectedRows: rows.length,
      toIndex: candidates.length,
      skippedMissingSanitized,
    }, null, 2));

    let upsertedPoints = 0;
    const BATCH = 32;

    for (let i = 0; i < candidates.length; i += BATCH) {
      const batch = candidates.slice(i, i + BATCH);
      const texts = batch.map((item) => item.chunk.text);
      const vectors = await embedTexts(embedBaseUrl, embedModel, texts, BATCH);

      const points = batch.map((item, idx) => ({
        id: item.pointId,
        vector: vectors[idx],
        payload: {
          tenant_id: item.row.tenant_id,
          event_id: item.row.id,
          kind: item.row.kind,
          created_at: toIso(item.row.created_at),
          correlation_id: item.row.correlation_id ?? null,
          route: item.chunk.route,
        },
      }));

      await upsertPoints(qdrantUrl, collection, points);
      upsertedPoints += points.length;

      console.log('UPSERT_BATCH_OK', JSON.stringify({
        batchIndex: Math.floor(i / BATCH) + 1,
        batchSize: points.length,
        upsertedPoints,
      }, null, 2));
    }

    const collectionInfo = await getCollectionInfo(qdrantUrl, collection);
    const pointsCount =
      collectionInfo?.result?.points_count ??
      collectionInfo?.result?.vectors_count ??
      null;
    console.log('QDRANT_COLLECTION_INFO', JSON.stringify({
      points_count: pointsCount,
      status: collectionInfo?.status ?? null,
      collection,
    }, null, 2));

    if (searchQuery) {
      const [queryVector] = await embedTexts(embedBaseUrl, embedModel, [searchQuery], 1);
      const searchRes = await searchPoints(qdrantUrl, collection, queryVector, tenantId, searchLimit);
      const top = (searchRes?.result ?? []).map((item) => ({
        score: item?.score ?? null,
        payload: item?.payload ?? null,
      }));

      console.log('QDRANT_SEARCH_TOP', JSON.stringify({
        query: searchQuery,
        top,
      }, null, 2));
    }
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error('INGEST_FATAL', error);
  process.exit(1);
});
