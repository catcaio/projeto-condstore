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

function parseBool(value) {
  if (value === undefined) return undefined;
  return String(value).toLowerCase() === 'true';
}

function parseNum(value) {
  if (value === undefined) return undefined;
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : undefined;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const tenantId = String(args.tenantId || '').trim();
  if (!tenantId) {
    throw new Error('--tenantId is required');
  }

  const { runQdrantReindex } = await import('../src/infra/vector/qdrant-reindex.ts');

  console.log('REINDEX_START', JSON.stringify({
    tenantId,
    docs: parseBool(args.docs),
    chat: parseBool(args.chat),
    sinceHours: parseNum(args.sinceHours),
    full: parseBool(args.full),
  }, null, 2));

  const summary = await runQdrantReindex({
    tenantId,
    docs: parseBool(args.docs),
    chat: parseBool(args.chat),
    sinceHours: parseNum(args.sinceHours),
    full: parseBool(args.full),
  });

  console.log('REINDEX_SUMMARY', JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error('REINDEX_FATAL', error);
  process.exit(1);
});
