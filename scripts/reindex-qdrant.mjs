import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

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

function loadLocalEnv() {
  const cwd = process.cwd();
  for (const file of ['.env.local', '.env']) {
    const full = path.join(cwd, file);
    if (fs.existsSync(full)) {
      dotenv.config({ path: full, override: false });
    }
  }
}

function parseBool(value) {
  if (value === undefined) return undefined;
  return String(value).toLowerCase() === 'true';
}

function parseNum(value) {
  if (value === undefined) return undefined;
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : undefined;
}

function boolFlag(input, fallback) {
  return typeof input === 'boolean' ? input : fallback;
}

function resolveChannelSelection({ docs, chat, full }) {
  const isFull = full === true;
  const docsExplicit = typeof docs === 'boolean';
  const chatExplicit = typeof chat === 'boolean';
  if (!docsExplicit && !chatExplicit) {
    return { docs: true, chat: true, full: isFull };
  }
  return {
    docs: boolFlag(docs, false),
    chat: boolFlag(chat, false),
    full: isFull,
  };
}

function computeSinceIso(sinceHours) {
  const ms = Math.max(1, Math.trunc(sinceHours)) * 60 * 60 * 1000;
  return new Date(Date.now() - ms).toISOString();
}

function parseJsonBlocks(stdout, prefix) {
  const values = [];
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escaped}\\s+(\\{[\\s\\S]*?\\n\\})`, 'g');
  let match;
  while ((match = regex.exec(stdout)) !== null) {
    try {
      values.push(JSON.parse(match[1]));
    } catch {
      // ignore malformed block
    }
  }
  return values;
}

function parseDocsIngestSummary(stdout) {
  let upserted = 0;
  let skipped = 0;
  for (const block of parseJsonBlocks(stdout, 'UPSERT_BATCH_OK')) {
    const n = block?.upsertedPoints;
    if (typeof n === 'number') upserted = Math.max(upserted, n);
  }
  for (const block of parseJsonBlocks(stdout, 'DOCS_INGEST_SOURCE')) {
    const n = block?.skippedEmpty;
    if (typeof n === 'number') skipped = n;
  }
  return { upserted, skipped };
}

function parseChatIngestSummary(stdout) {
  let upserted = 0;
  let skipped = 0;
  for (const block of parseJsonBlocks(stdout, 'UPSERT_BATCH_OK')) {
    const n = block?.upsertedPoints;
    if (typeof n === 'number') upserted = Math.max(upserted, n);
  }
  for (const block of parseJsonBlocks(stdout, 'INGEST_SOURCE')) {
    const n = block?.skippedMissingSanitized;
    if (typeof n === 'number') skipped = n;
  }
  return { upserted, skipped };
}

function runNodeScript(scriptPath, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      const s = String(d);
      stdout += s;
      process.stdout.write(s);
    });
    child.stderr.on('data', (d) => {
      const s = String(d);
      stderr += s;
      process.stderr.write(s);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`Script failed (${path.basename(scriptPath)}) code=${code}`));
    });
  });
}

async function main() {
  loadLocalEnv();
  const args = parseArgs(process.argv.slice(2));
  const tenantId = String(args.tenantId || '').trim();
  if (!tenantId) throw new Error('--tenantId is required');

  const parsedDocs = parseBool(args.docs);
  const parsedChat = parseBool(args.chat);
  const parsedFull = parseBool(args.full);
  const parsedSinceHours = parseNum(args.sinceHours);
  const sel = resolveChannelSelection({ docs: parsedDocs, chat: parsedChat, full: parsedFull });
  const sinceHours = typeof parsedSinceHours === 'number' ? Math.max(1, parsedSinceHours) : null;

  console.log('REINDEX_START', JSON.stringify({
    tenantId,
    docs: sel.docs,
    chat: sel.chat,
    sinceHours,
    full: sel.full,
  }, null, 2));

  let docsSummary = { upserted: 0, skipped: 0 };
  let chatSummary = { upserted: 0, skipped: 0 };

  if (sel.docs) {
    const docsScript = path.join(process.cwd(), 'scripts', 'ingest-docs-to-qdrant.mjs');
    const { stdout } = await runNodeScript(docsScript, ['--tenantId', tenantId]);
    docsSummary = parseDocsIngestSummary(stdout);
  }

  if (sel.chat) {
    const chatScript = path.join(process.cwd(), 'scripts', 'ingest-frank-events-to-qdrant.mjs');
    const chatArgs = ['--tenantId', tenantId];
    if (!sel.full && sinceHours != null) {
      chatArgs.push('--from', computeSinceIso(sinceHours));
    }
    chatArgs.push('--limit', sel.full ? '50000' : '5000');
    const { stdout } = await runNodeScript(chatScript, chatArgs);
    chatSummary = parseChatIngestSummary(stdout);
  }

  const summary = {
    tenantId,
    docs: sel.docs,
    chat: sel.chat,
    sinceHours,
    full: sel.full,
    points_upserted: docsSummary.upserted + chatSummary.upserted,
    points_skipped: docsSummary.skipped + chatSummary.skipped,
    docs_points_upserted: docsSummary.upserted,
    docs_points_skipped: docsSummary.skipped,
    chat_points_upserted: chatSummary.upserted,
    chat_points_skipped: chatSummary.skipped,
  };

  console.log('REINDEX_SUMMARY', JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error('REINDEX_FATAL', error);
  process.exit(1);
});
