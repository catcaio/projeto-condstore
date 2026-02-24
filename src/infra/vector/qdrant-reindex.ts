import { spawn } from 'node:child_process';
import path from 'node:path';

export interface QdrantReindexInput {
  tenantId: string;
  docs?: boolean;
  chat?: boolean;
  sinceHours?: number;
  full?: boolean;
}

export interface QdrantReindexSummary {
  tenantId: string;
  docs: boolean;
  chat: boolean;
  sinceHours: number | null;
  full: boolean;
  points_upserted: number;
  points_skipped: number;
  docs_points_upserted: number;
  docs_points_skipped: number;
  chat_points_upserted: number;
  chat_points_skipped: number;
}

interface ParsedChildSummary {
  upserted: number;
  skipped: number;
}

function parseJsonAfterPrefix(line: string, prefix: string): unknown | null {
  if (!line.startsWith(prefix)) return null;
  const jsonText = line.slice(prefix.length).trim();
  if (!jsonText) return null;
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function parseJsonBlocks(stdout: string, prefix: string): unknown[] {
  const values: unknown[] = [];
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

function resolveNodeCommand(): string {
  return process.execPath || 'node';
}

function boolFlag(input: boolean | undefined, fallback: boolean): boolean {
  return typeof input === 'boolean' ? input : fallback;
}

function resolveChannelSelection(input: QdrantReindexInput) {
  const full = input.full === true;
  const docsExplicit = typeof input.docs === 'boolean';
  const chatExplicit = typeof input.chat === 'boolean';

  if (!docsExplicit && !chatExplicit) {
    return { docs: true, chat: true, full };
  }

  return {
    docs: boolFlag(input.docs, false),
    chat: boolFlag(input.chat, false),
    full,
  };
}

function computeSinceIso(sinceHours: number): string {
  const ms = Math.max(1, Math.trunc(sinceHours)) * 60 * 60 * 1000;
  return new Date(Date.now() - ms).toISOString();
}

async function runScript(scriptPath: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(resolveNodeCommand(), [scriptPath, ...args], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Script failed (${path.basename(scriptPath)}) code=${code}\n${stdout}\n${stderr}`));
      }
    });
  });
}

function parseDocsIngestSummary(stdout: string): ParsedChildSummary {
  let upserted = 0;
  let skipped = 0;
  for (const upsert of parseJsonBlocks(stdout, 'UPSERT_BATCH_OK')) {
    if (upsert && typeof upsert === 'object') {
      const n = (upsert as { upsertedPoints?: unknown }).upsertedPoints;
      if (typeof n === 'number') upserted = Math.max(upserted, n);
    }
  }
  for (const src of parseJsonBlocks(stdout, 'DOCS_INGEST_SOURCE')) {
    if (src && typeof src === 'object') {
      const n = (src as { skippedEmpty?: unknown }).skippedEmpty;
      if (typeof n === 'number') skipped = n;
    }
  }

  return { upserted, skipped };
}

function parseChatIngestSummary(stdout: string): ParsedChildSummary {
  let upserted = 0;
  let skipped = 0;
  for (const upsert of parseJsonBlocks(stdout, 'UPSERT_BATCH_OK')) {
    if (upsert && typeof upsert === 'object') {
      const n = (upsert as { upsertedPoints?: unknown }).upsertedPoints;
      if (typeof n === 'number') upserted = Math.max(upserted, n);
    }
  }
  for (const src of parseJsonBlocks(stdout, 'INGEST_SOURCE')) {
    if (src && typeof src === 'object') {
      const n = (src as { skippedMissingSanitized?: unknown }).skippedMissingSanitized;
      if (typeof n === 'number') skipped = n;
    }
  }

  return { upserted, skipped };
}

export async function runQdrantReindex(input: QdrantReindexInput): Promise<QdrantReindexSummary> {
  const tenantId = input.tenantId?.trim();
  if (!tenantId) throw new Error('tenantId is required');

  const { docs, chat, full } = resolveChannelSelection(input);
  const sinceHours = typeof input.sinceHours === 'number' && Number.isFinite(input.sinceHours)
    ? Math.max(1, Math.trunc(input.sinceHours))
    : null;

  let docsSummary: ParsedChildSummary = { upserted: 0, skipped: 0 };
  let chatSummary: ParsedChildSummary = { upserted: 0, skipped: 0 };

  if (docs) {
    const docsScript = path.join(process.cwd(), 'scripts', 'ingest-docs-to-qdrant.mjs');
    const { stdout } = await runScript(docsScript, ['--tenantId', tenantId]);
    docsSummary = parseDocsIngestSummary(stdout);
  }

  if (chat) {
    const chatScript = path.join(process.cwd(), 'scripts', 'ingest-frank-events-to-qdrant.mjs');
    const args = ['--tenantId', tenantId];
    if (!full && sinceHours != null) {
      args.push('--from', computeSinceIso(sinceHours));
    }
    // Use a higher default ceiling for operational reindex runs.
    args.push('--limit', full ? '50000' : '5000');
    const { stdout } = await runScript(chatScript, args);
    chatSummary = parseChatIngestSummary(stdout);
  }

  return {
    tenantId,
    docs,
    chat,
    sinceHours,
    full,
    points_upserted: docsSummary.upserted + chatSummary.upserted,
    points_skipped: docsSummary.skipped + chatSummary.skipped,
    docs_points_upserted: docsSummary.upserted,
    docs_points_skipped: docsSummary.skipped,
    chat_points_upserted: chatSummary.upserted,
    chat_points_skipped: chatSummary.skipped,
  };
}
