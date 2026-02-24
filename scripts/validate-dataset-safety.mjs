import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const [, , fileArg, ...restArgs] = process.argv;

if (!fileArg) {
  console.error('Uso: node scripts/validate-dataset-safety.mjs <arquivo.jsonl> [--require-frank-fields]');
  process.exit(1);
}

const resolvedFile = path.resolve(fileArg);
if (!fs.existsSync(resolvedFile)) {
  console.error(`Arquivo não encontrado: ${resolvedFile}`);
  process.exit(1);
}

const flags = new Set(restArgs);
const requireFrankFields = flags.has('--require-frank-fields');
const maxFindings = 20;

const forbiddenPatterns = [
  { code: 'email', re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { code: 'phone', re: /(?:\+?[1-9]\d{7,14}|(?:\+?55[\s-]?)?(?:\(?\d{2}\)?[\s-]?)?(?:9?\d{4})[\s-]?\d{4})/i },
  { code: 'mysql_url', re: /\bmysql2?:\/\/[^\s"'`]+/i },
  { code: 'postgres_url', re: /\bpostgres(?:ql)?:\/\/[^\s"'`]+/i },
  { code: 'bearer_token', re: /\bBearer\s+[A-Za-z0-9._-]+\b/i },
  { code: 'openai_key', re: /\bsk-[A-Za-z0-9_-]+\b/i },
  { code: 'env_secret', re: /\b(?:DATABASE_URL|AUTH_SECRET|INTERNAL_EXPORT_TOKEN|PROVIDER_SECRETS_KEY)\b/i },
];

const redactedMarkers = ['***EMAIL***', '***PHONE***', '***SECRET***'];

const requiredFrankFields = [
  'tenant_id',
  'model',
  'provider',
  'latency_ms',
  'tokens_prompt',
  'tokens_completion',
  'rag_used',
  'rag_chunks',
  'rag_latency_ms',
];

function normalizeLineForSafetyScan(line) {
  let out = String(line);
  for (const marker of redactedMarkers) {
    out = out.replaceAll(marker, '');
  }
  return out;
}

function hasValue(v) {
  return v !== null && v !== undefined && !(typeof v === 'string' && v.trim() === '');
}

const findings = [];
let lineNo = 0;
let parsedRows = 0;

const rl = readline.createInterface({
  input: fs.createReadStream(resolvedFile, { encoding: 'utf8' }),
  crlfDelay: Infinity,
});

for await (const rawLine of rl) {
  lineNo += 1;
  const line = rawLine.trim();
  if (!line) continue;

  const normalizedForScan = normalizeLineForSafetyScan(line);
  for (const { code, re } of forbiddenPatterns) {
    if (re.test(normalizedForScan)) {
      findings.push({ line: lineNo, type: code });
      if (findings.length >= maxFindings) break;
    }
  }
  if (findings.length >= maxFindings) break;

  if (requireFrankFields) {
    let parsed;
    try {
      parsed = JSON.parse(line);
      parsedRows += 1;
    } catch {
      findings.push({ line: lineNo, type: 'invalid_json' });
      if (findings.length >= maxFindings) break;
      continue;
    }

    for (const field of requiredFrankFields) {
      if (!hasValue(parsed[field])) {
        findings.push({ line: lineNo, type: `missing_field:${field}` });
        if (findings.length >= maxFindings) break;
      }
    }
    if (findings.length >= maxFindings) break;
  }
}

const result = {
  file: resolvedFile,
  requireFrankFields,
  linesScanned: lineNo,
  rowsParsed: parsedRows,
  findings,
  ok: findings.length === 0,
};

if (result.ok) {
  console.log('DATASET_SAFETY_OK', JSON.stringify(result, null, 2));
  process.exit(0);
}

console.error('DATASET_SAFETY_FAILED', JSON.stringify(result, null, 2));
process.exit(2);
