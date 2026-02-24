import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const [tenantId, fromArg, toArg, outFileArg] = process.argv.slice(2);

if (!tenantId || !outFileArg) {
  console.error('Uso: node scripts/export-frank-events.mjs <tenantId> <from|-> <to|-> <outFile>');
  process.exit(1);
}

const internalToken = process.env.INTERNAL_EXPORT_TOKEN;
if (!internalToken) {
  console.error('INTERNAL_EXPORT_TOKEN não definida.');
  process.exit(1);
}

const baseUrl = process.env.INTERNAL_EXPORT_BASE_URL ?? 'http://127.0.0.1:3000';
const from = fromArg && fromArg !== '-' ? fromArg : undefined;
const to = toArg && toArg !== '-' ? toArg : undefined;
const outFile = path.resolve(outFileArg);

const url = new URL('/api/internal/exports/frank-events', baseUrl);
url.searchParams.set('tenantId', tenantId);
if (from) url.searchParams.set('from', from);
if (to) url.searchParams.set('to', to);
if (process.env.EXPORT_LIMIT) url.searchParams.set('limit', process.env.EXPORT_LIMIT);

const startedAt = Date.now();
console.log('EXPORT_START', JSON.stringify({ url: url.toString(), outFile }, null, 2));

const response = await fetch(url, {
  method: 'GET',
  headers: {
    'x-internal-token': internalToken,
  },
});

if (!response.ok || !response.body) {
  const errorBody = await response.text().catch(() => '');
  console.error('EXPORT_FAILED', JSON.stringify({
    status: response.status,
    statusText: response.statusText,
    body: errorBody.slice(0, 1000),
  }, null, 2));
  process.exit(1);
}

await fs.promises.mkdir(path.dirname(outFile), { recursive: true });

const nodeReadable = Readable.fromWeb(response.body);
await pipeline(nodeReadable, fs.createWriteStream(outFile));

const stat = await fs.promises.stat(outFile);
const durationMs = Date.now() - startedAt;
console.log('EXPORT_OK', JSON.stringify({
  outFile,
  bytes: stat.size,
  durationMs,
}, null, 2));

