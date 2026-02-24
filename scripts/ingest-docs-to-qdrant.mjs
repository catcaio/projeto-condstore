import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) continue;
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        out[key] = next;
        i += 1;
      } else {
        out[key] = 'true';
      }
      continue;
    }
    const eq = token.indexOf('=');
    if (eq > 0) {
      out[token.slice(0, eq)] = token.slice(eq + 1);
    }
  }
  return out;
}

function getEnv(name, fallback) {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : fallback;
}

function getRequiredEnv(name) {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`${name} is required`);
  return v.trim();
}

function sha1Hex(value) {
  return crypto.createHash('sha1').update(value).digest('hex');
}

function sha1ToDeterministicUuid(sha1) {
  const hex = String(sha1).replace(/[^a-fA-F0-9]/g, '').toLowerCase();
  const base = (hex.length >= 32 ? hex.slice(0, 32) : hex.padEnd(32, '0')).split('');
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

async function qdrantRequest(baseUrl, requestPath, { method = 'GET', body } = {}) {
  const hasBody = body !== undefined;
  const res = await fetch(`${baseUrl}${requestPath}`, {
    method,
    headers: qdrantHeaders(hasBody),
    body: hasBody ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text().catch(() => '');
  let parsed;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  if (!res.ok) {
    throw new Error(`Qdrant ${method} ${requestPath} failed (${res.status}): ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`);
  }
  return parsed;
}

async function ensureCollection(qdrantUrl, collection) {
  try {
    await qdrantRequest(qdrantUrl, `/collections/${encodeURIComponent(collection)}`, { method: 'GET' });
    return { ensured: false };
  } catch (err) {
    if (!String(err?.message ?? err).includes('(404)')) throw err;
  }

  try {
    await qdrantRequest(qdrantUrl, `/collections/${encodeURIComponent(collection)}`, {
      method: 'PUT',
      body: { vectors: { size: 768, distance: 'Cosine' } },
    });
    return { ensured: true };
  } catch (err) {
    if (String(err?.message ?? err).includes('(409)')) return { ensured: false };
    throw err;
  }
}

async function upsertPoints(qdrantUrl, collection, points) {
  const endpoint = `/collections/${encodeURIComponent(collection)}/points?wait=true`;
  try {
    return await qdrantRequest(qdrantUrl, endpoint, { method: 'POST', body: { points } });
  } catch (err) {
    if (!String(err?.message ?? err).includes('(400)')) throw err;
    return qdrantRequest(qdrantUrl, endpoint, { method: 'PUT', body: { points } });
  }
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
    body: JSON.stringify({ model, input: texts }),
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

function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.md' || ext === '.txt';
}

function safeStat(targetPath) {
  try {
    return fs.statSync(targetPath);
  } catch {
    return null;
  }
}

function listFilesRecursive(rootPath) {
  const files = [];
  const entries = fs.readdirSync(rootPath, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'qdrant_data') {
        continue;
      }
      files.push(...listFilesRecursive(full));
      continue;
    }
    if (entry.isFile() && isTextFile(full)) {
      files.push(full);
    }
  }
  return files;
}

function defaultSourcePaths() {
  return ['README.md', 'docs', 'auditoria_report.md', 'audit_report.md'];
}

function resolveInputPaths(repoRoot, rawPaths) {
  const seen = new Set();
  const files = [];
  const requested = rawPaths.length ? rawPaths : defaultSourcePaths();

  for (const item of requested) {
    const trimmed = String(item || '').trim();
    if (!trimmed) continue;
    const full = path.resolve(repoRoot, trimmed);
    const st = safeStat(full);
    if (!st) continue;

    if (st.isFile()) {
      if (!isTextFile(full)) continue;
      const rel = path.relative(repoRoot, full).replace(/\\/g, '/');
      if (!seen.has(rel)) {
        seen.add(rel);
        files.push({ full, rel });
      }
      continue;
    }

    if (st.isDirectory()) {
      for (const nested of listFilesRecursive(full)) {
        const rel = path.relative(repoRoot, nested).replace(/\\/g, '/');
        if (!seen.has(rel)) {
          seen.add(rel);
          files.push({ full: nested, rel });
        }
      }
    }
  }

  files.sort((a, b) => a.rel.localeCompare(b.rel));
  return files;
}

function stripFrontmatter(text) {
  if (!text.startsWith('---')) return text;
  const match = text.match(/^---\s*\n[\s\S]*?\n---\s*\n?/);
  return match ? text.slice(match[0].length) : text;
}

function normalizeText(text) {
  const noFrontmatter = stripFrontmatter(String(text || ''));
  return noFrontmatter
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function chunkText(text, chunkSize, overlap) {
  const chunks = [];
  if (!text) return chunks;
  const size = Math.max(100, chunkSize);
  const safeOverlap = Math.max(0, Math.min(overlap, size - 1));
  const step = Math.max(1, size - safeOverlap);

  for (let start = 0, idx = 0; start < text.length; start += step, idx += 1) {
    const slice = text.slice(start, start + size).trim();
    if (!slice) continue;
    chunks.push({
      chunkIndex: idx,
      start,
      end: Math.min(start + size, text.length),
      text: slice,
    });
    if (start + size >= text.length) break;
  }

  return chunks;
}

function parseSearchLimit(args) {
  const n = Number.parseInt(args.searchLimit || '3', 10);
  if (!Number.isFinite(n) || n <= 0) return 3;
  return Math.min(n, 10);
}

async function searchPoints(qdrantUrl, collection, vector, tenantId, limit = 3) {
  return qdrantRequest(qdrantUrl, `/collections/${encodeURIComponent(collection)}/points/search`, {
    method: 'POST',
    body: {
      vector,
      limit,
      with_payload: true,
      filter: {
        must: [{ key: 'tenant_id', match: { value: tenantId } }],
      },
    },
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const tenantId = (args.tenantId || 'lojacond-default').trim();
  const pathsArg = typeof args.paths === 'string' ? args.paths : defaultSourcePaths().join(',');
  const requestedPaths = pathsArg.split(',').map((s) => s.trim()).filter(Boolean);
  const collection = (args.collection || getEnv('QDRANT_COLLECTION', 'condstore_docs')).trim();
  const chunkSize = Math.max(100, Number.parseInt(args.chunkSize || '800', 10) || 800);
  const overlap = Math.max(0, Number.parseInt(args.overlap || '120', 10) || 120);
  const limitFiles = args.limitFiles ? Math.max(1, Number.parseInt(args.limitFiles, 10) || 1) : null;
  const qdrantUrl = getEnv('QDRANT_URL', 'http://127.0.0.1:6333').replace(/\/$/, '');
  const embedBaseUrl = getEnv('DEFAULT_LMSTUDIO_BASE_URL', 'http://127.0.0.1:1234/v1').replace(/\/$/, '');
  const embedModel = args.embedModel || getRequiredEnv('DEFAULT_EMBED_MODEL');
  const searchQuery = args.searchQuery || null;
  const searchLimit = parseSearchLimit(args);

  if (!tenantId) throw new Error('tenantId is required');
  if (overlap >= chunkSize) throw new Error('overlap must be smaller than chunkSize');

  const allFiles = resolveInputPaths(repoRoot, requestedPaths);
  const files = limitFiles ? allFiles.slice(0, limitFiles) : allFiles;
  const createdAt = new Date().toISOString();

  console.log('DOCS_INGEST_CONFIG', JSON.stringify({
    tenantId,
    collection,
    qdrantUrl,
    embedBaseUrl,
    embedModel,
    paths: requestedPaths,
    resolvedFiles: allFiles.length,
    ingestFiles: files.length,
    chunkSize,
    overlap,
    limitFiles,
    searchQuery,
    searchLimit,
  }, null, 2));

  if (files.length === 0) {
    console.log('DOCS_INGEST_NO_FILES');
    return;
  }

  const ensure = await ensureCollection(qdrantUrl, collection);
  console.log('QDRANT_COLLECTION_READY', JSON.stringify({ collection, ensured: ensure.ensured }, null, 2));

  const records = [];
  let skippedEmpty = 0;

  for (const file of files) {
    const raw = fs.readFileSync(file.full, 'utf8');
    const normalized = normalizeText(raw);
    if (!normalized) {
      skippedEmpty += 1;
      continue;
    }
    const chunks = chunkText(normalized, chunkSize, overlap);
    for (const chunk of chunks) {
      const pointId = sha1ToDeterministicUuid(sha1Hex(`${tenantId}:${file.rel}:${chunk.chunkIndex}`));
      records.push({
        pointId,
        filePath: file.rel,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        createdAt,
        start: chunk.start,
        end: chunk.end,
      });
    }
  }

  console.log('DOCS_INGEST_SOURCE', JSON.stringify({
    filesProcessed: files.length,
    chunksPrepared: records.length,
    skippedEmpty,
  }, null, 2));

  const BATCH = 32;
  let upsertedPoints = 0;

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const vectors = await embedTexts(embedBaseUrl, embedModel, batch.map((r) => r.text), BATCH);

    const points = batch.map((item, idx) => ({
      id: item.pointId,
      vector: vectors[idx],
      payload: {
        tenant_id: tenantId,
        source: 'repo',
        path: item.filePath,
        chunk_index: item.chunkIndex,
        text: item.text,
        created_at: item.createdAt,
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
    collection,
    points_count: pointsCount,
    status: collectionInfo?.status ?? null,
  }, null, 2));

  if (searchQuery) {
    const [queryVector] = await embedTexts(embedBaseUrl, embedModel, [searchQuery], 1);
    const searchRes = await searchPoints(qdrantUrl, collection, queryVector, tenantId, searchLimit);
    const top = Array.isArray(searchRes?.result)
      ? searchRes.result.map((item) => ({
          score: item?.score ?? null,
          payload: item?.payload ?? null,
        }))
      : [];
    console.log('QDRANT_SEARCH_TOP', JSON.stringify({ query: searchQuery, top }, null, 2));
  }
}

main().catch((error) => {
  console.error('DOCS_INGEST_FATAL', error);
  process.exit(1);
});
