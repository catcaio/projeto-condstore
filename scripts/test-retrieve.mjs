function truncate(text, maxLen = 160) {
  if (typeof text !== 'string') return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen)}...`;
}

function truncateChunkText(text, maxLen = 500) {
  if (typeof text !== 'string') return '';
  const clean = text.trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen)}...[truncated]`;
}

function formatDateShort(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso ?? '');
  return d.toISOString().slice(0, 10);
}

function getRagMinScore() {
  const n = Number.parseFloat(process.env.RAG_MIN_SCORE || '0.75');
  if (!Number.isFinite(n)) return 0.75;
  return Math.max(0, Math.min(n, 1));
}

function getChannelMinScore(name, fallback) {
  const raw = process.env[name] ?? process.env.RAG_MIN_SCORE ?? String(fallback);
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(n, 1));
}

async function main() {
  const tenantId = process.argv[2] ?? 'lojacond-default';
  const query = process.argv[3] ?? 'ping';
  const limit = Math.max(1, Number.parseInt(process.argv[4] ?? '5', 10) || 5);
  const minScore = getRagMinScore();
  const docsMinScore = getChannelMinScore('RAG_DOCS_MIN_SCORE', minScore);
  const chatMinScore = getChannelMinScore('RAG_CHAT_MIN_SCORE', minScore);
  const docsLimit = Math.max(0, Number.parseInt(process.env.RAG_DOCS_MAX_CHUNKS || '3', 10) || 3);
  const chatLimit = Math.max(0, Number.parseInt(process.env.RAG_CHAT_MAX_CHUNKS || '2', 10) || 2);
  const { retrieveContextMulti } = await import('../src/core/ai/retrieval/retrieve-context.ts');

  console.log('TEST_RETRIEVE_CONFIG', JSON.stringify({
    tenantId,
    query,
    limit,
    minScore,
    docsLimit,
    chatLimit,
    docsMinScore,
    chatMinScore,
    qdrantUrl: process.env.QDRANT_URL || 'http://127.0.0.1:6333',
    collection: process.env.QDRANT_COLLECTION || 'condstore_docs',
    embedBaseUrl: process.env.DEFAULT_LMSTUDIO_BASE_URL || 'http://127.0.0.1:1234/v1',
    embedModel: process.env.DEFAULT_EMBED_MODEL || null,
  }, null, 2));

  const first = await retrieveContextMulti({ tenantId, query, docsLimit, chatLimit });
  const second = await retrieveContextMulti({ tenantId, query, docsLimit, chatLimit });

  const rawDocs = first.docs;
  const rawChat = first.chat;
  const docsChunks = rawDocs.filter((chunk) => chunk.score >= docsMinScore);
  const chatChunks = rawChat.filter((chunk) => chunk.score >= chatMinScore);
  const rawChunks = [...rawDocs, ...rawChat];
  const chunks = [...docsChunks, ...chatChunks].slice(0, limit);

  console.log('RETRIEVE_STATS', JSON.stringify({
    firstCacheHit: first.cacheHit === true,
    secondCacheHit: second.cacheHit === true,
    rawChunks: rawChunks.length,
    rawDocsChunks: rawDocs.length,
    rawChatChunks: rawChat.length,
    thresholdChunks: chunks.length,
    thresholdApplied: minScore,
    docsThresholdApplied: docsMinScore,
    chatThresholdApplied: chatMinScore,
    docsThresholdChunks: docsChunks.length,
    chatThresholdChunks: chatChunks.length,
    thresholdZeroChunks: rawChunks.length > 0 && chunks.length === 0,
  }, null, 2));

  console.log(`TOP_K (${chunks.length})`);
  chunks.forEach((chunk, idx) => {
    console.log(
      `[${idx + 1}] score=${chunk.score.toFixed(4)} source=${chunk.meta.source ?? 'frank_event'} path=${chunk.meta.path ?? 'n/a'} chunk=${chunk.meta.chunk_index ?? 'n/a'} event_id=${chunk.meta.event_id ?? 'n/a'} corr=${chunk.meta.correlation_id ?? 'n/a'} route=${chunk.meta.route ?? 'n/a'}`,
    );
    console.log(`    ${truncate(chunk.text, 160)}`);
  });

  const docsOut = chunks.filter((c) => c.meta.source === 'repo');
  const chatOut = chunks.filter((c) => c.meta.source !== 'repo');
  const lines = [];
  if (docsOut.length > 0) {
    lines.push('### Contexto (Docs)');
    docsOut.forEach((chunk, idx) => {
      const score = Number.isFinite(chunk.score) ? chunk.score.toFixed(2) : '0.00';
      lines.push(`[D${idx + 1}] (score=${score}, path=${chunk.meta.path ?? 'n/a'})`);
      lines.push(truncateChunkText(chunk.text, 500) || '[sem texto]');
      lines.push('');
    });
  }
  if (chatOut.length > 0) {
    lines.push('### Contexto (Memória)');
    chatOut.forEach((chunk, idx) => {
      const score = Number.isFinite(chunk.score) ? chunk.score.toFixed(2) : '0.00';
      const datePart = chunk.meta.created_at ? formatDateShort(chunk.meta.created_at) : 'n/a';
      lines.push(`[M${idx + 1}] (score=${score}, date=${datePart})`);
      lines.push(truncateChunkText(chunk.text, 500) || '[sem texto]');
      lines.push('');
    });
  }
  if (chunks.length === 0) {
    lines.push('### Contexto (Docs)');
    lines.push('[sem chunks acima do threshold]');
  }

  console.log('CONTEXT_PACK_MD');
  console.log(lines.join('\n'));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('TEST_RETRIEVE_FATAL', error);
    process.exit(1);
  });
