import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { Readable } from 'node:stream';
import { spawnSync } from 'node:child_process';

function getArgFlag(name) {
  const args = process.argv.slice(2);
  const idx = args.findIndex((arg) => arg === `--${name}`);
  if (idx === -1) return undefined;
  const value = args[idx + 1];
  if (!value || value.startsWith('--')) return '';
  return value;
}

function normalizeOptionalDateArg(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed === '-') return undefined;
  return trimmed;
}

const [tenantId, fromArg, toArg, outFileArg] = process.argv.slice(2);

if (!tenantId || !outFileArg) {
  console.error('Uso: node scripts/export-frank-events.mjs <tenantId> <from|-> <to|-> <outFile>');
  process.exit(1);
}

const internalToken = String(process.env.INTERNAL_EXPORT_TOKEN ?? '').trim();

const baseUrl = process.env.INTERNAL_EXPORT_BASE_URL ?? 'http://127.0.0.1:3000';
const from = normalizeOptionalDateArg(fromArg);
const to = normalizeOptionalDateArg(toArg);
const outFile = path.resolve(outFileArg);
const datasetVersion = getArgFlag('dataset-version') || process.env.DATASET_VERSION || 'frank-events/v1';
const modelIdOverride = getArgFlag('model-id') || process.env.DEFAULT_LMSTUDIO_MODEL || null;
const embedModelId = getArgFlag('embed-model-id') || process.env.DEFAULT_EMBED_MODEL || null;

function getGitShortHash() {
  try {
    const headPath = path.resolve('.git', 'HEAD');
    const head = fs.readFileSync(headPath, 'utf8').trim();
    if (head.startsWith('ref: ')) {
      const ref = head.slice(5).trim();
      const refPath = path.resolve('.git', ref);
      if (fs.existsSync(refPath)) {
        const commit = fs.readFileSync(refPath, 'utf8').trim();
        if (commit) return commit.slice(0, 7);
      }
    } else if (/^[0-9a-f]{40}$/i.test(head)) {
      return head.slice(0, 7);
    }
  } catch {
    // Fallback to git command below.
  }
  const result = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    shell: process.platform === 'win32',
  });
  if (result.status === 0) {
    const hash = String(result.stdout || '').trim();
    if (hash) return hash;
  }
  return 'unknown';
}

const appVersion = getArgFlag('app-version') || getGitShortHash();

const url = new URL('/api/internal/exports/frank-events', baseUrl);
url.searchParams.set('tenantId', tenantId);
if (from) url.searchParams.set('from', from);
if (to) url.searchParams.set('to', to);
if (process.env.EXPORT_LIMIT) url.searchParams.set('limit', process.env.EXPORT_LIMIT);
url.searchParams.set('datasetVersion', datasetVersion);
url.searchParams.set('appVersion', appVersion);
if (modelIdOverride) url.searchParams.set('modelId', modelIdOverride);
if (embedModelId) url.searchParams.set('embedModelId', embedModelId);

const startedAt = Date.now();
console.log('EXPORT_START', JSON.stringify({ url: url.toString(), outFile }, null, 2));
if (!internalToken) {
  console.log('EXPORT_INFO', JSON.stringify({
    warning: 'INTERNAL_EXPORT_TOKEN vazia; tentando sem x-internal-token (bypass local/dev).',
  }, null, 2));
}

const headers = {};
if (internalToken) {
  headers['x-internal-token'] = internalToken;
}
let response;
try {
  response = await fetch(url, {
    method: 'GET',
    headers,
  });
} catch (error) {
  console.error('EXPORT_FAILED', JSON.stringify({
    reason: 'request_failed',
    error: String(error?.message ?? error),
  }, null, 2));
  process.exit(1);
}

if (!response.ok || !response.body) {
  const errorBody = await response.text().catch(() => '');
  console.error('EXPORT_FAILED', JSON.stringify({
    status: response.status,
    statusText: response.statusText,
    body: errorBody.slice(0, 1000),
    hint: response.status === 401 && !internalToken
      ? '401 sem token. Defina READY_INTERNAL_TOKEN ou INTERNAL_EXPORT_TOKEN.'
      : undefined,
  }, null, 2));
  process.exit(1);
}

await fs.promises.mkdir(path.dirname(outFile), { recursive: true });
const tmpOutFile = `${outFile}.tmp`;

const nodeReadable = Readable.fromWeb(response.body);
const rl = readline.createInterface({
  input: nodeReadable,
  crlfDelay: Infinity,
});
const out = fs.createWriteStream(tmpOutFile, { flags: 'w' });

let lineCount = 0;
for await (const line of rl) {
  if (!line || !line.trim()) continue;
  let row;
  try {
    row = JSON.parse(line);
  } catch (error) {
    out.destroy();
    await fs.promises.rm(tmpOutFile, { force: true }).catch(() => {});
    console.error('EXPORT_FAILED', JSON.stringify({
      reason: 'invalid_jsonl_from_export_endpoint',
      line: lineCount + 1,
      error: String(error?.message ?? error),
    }, null, 2));
    process.exit(1);
  }

  if (row && typeof row === 'object' && row.ok === false && typeof row.error === 'string') {
    out.destroy();
    await fs.promises.rm(tmpOutFile, { force: true }).catch(() => {});
    console.error('EXPORT_FAILED', JSON.stringify({
      reason: 'export_stream_failed',
      error: row.error,
      requestId: row.requestId ?? null,
      line: lineCount + 1,
    }, null, 2));
    process.exit(1);
  }

  const enriched = {
    ...row,
    tokens_prompt: typeof row.tokens_prompt === 'number' ? row.tokens_prompt : 0,
    tokens_completion: typeof row.tokens_completion === 'number' ? row.tokens_completion : 0,
    rag_used: typeof row.rag_used === 'number' ? row.rag_used : 0,
    rag_chunks: typeof row.rag_chunks === 'number' ? row.rag_chunks : 0,
    rag_latency_ms: typeof row.rag_latency_ms === 'number' ? row.rag_latency_ms : 0,
    dataset_version: datasetVersion,
    app_version: appVersion,
    model_id: typeof row.model === 'string' && row.model ? row.model : modelIdOverride,
    embed_model_id: embedModelId,
  };
  out.write(`${JSON.stringify(enriched)}\n`);
  lineCount += 1;
}

await new Promise((resolve, reject) => {
  out.end((err) => (err ? reject(err) : resolve()));
});
await fs.promises.rename(tmpOutFile, outFile);

const stat = await fs.promises.stat(outFile);
const durationMs = Date.now() - startedAt;
console.log('EXPORT_OK', JSON.stringify({
  outFile,
  lineCount,
  datasetVersion,
  appVersion,
  modelId: modelIdOverride,
  embedModelId,
  bytes: stat.size,
  durationMs,
}, null, 2));

