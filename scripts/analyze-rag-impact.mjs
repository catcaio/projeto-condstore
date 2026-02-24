import mysql from 'mysql2/promise';

const tenantId = process.argv[2] ?? 'lojacond-default';
const url = process.env.DATABASE_URL;

if (!url) {
  console.error('DATABASE_URL não definida.');
  process.exit(1);
}

function parsePayloadJson(value) {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (typeof value === 'object') return value;
  return {};
}

function avg(nums) {
  if (!nums.length) return null;
  return Number((nums.reduce((sum, n) => sum + n, 0) / nums.length).toFixed(2));
}

function sumTokens(row) {
  const prompt = typeof row.tokens_prompt === 'number' ? row.tokens_prompt : 0;
  const completion = typeof row.tokens_completion === 'number' ? row.tokens_completion : 0;
  return prompt + completion;
}

const conn = await mysql.createConnection({
  uri: url,
  ssl: { rejectUnauthorized: false },
});

try {
  const [rows] = await conn.execute(
    `
      SELECT
        id,
        latency_ms,
        tokens_prompt,
        tokens_completion,
        created_at,
        payload_json
      FROM \`frank_events\`
      WHERE \`tenant_id\` = ?
        AND \`kind\` = 'ai.chat'
      ORDER BY \`created_at\` ASC
    `,
    [tenantId],
  );

  const withRagLatency = [];
  const withoutRagLatency = [];
  const withRagTokens = [];
  const withoutRagTokens = [];

  let ragOnRequests = 0;

  for (const row of rows) {
    const payload = parsePayloadJson(row.payload_json);
    const metadata = (payload && typeof payload === 'object' && payload.metadata && typeof payload.metadata === 'object')
      ? payload.metadata
      : {};

    const ragUsed = metadata.ragUsed === true;
    const totalLatencyMs = typeof metadata.totalLatencyMs === 'number'
      ? metadata.totalLatencyMs
      : (typeof row.latency_ms === 'number' ? row.latency_ms : null);

    const tokensTotal = sumTokens(row);

    if (ragUsed) {
      ragOnRequests += 1;
      if (typeof totalLatencyMs === 'number') withRagLatency.push(totalLatencyMs);
      withRagTokens.push(tokensTotal);
    } else {
      if (typeof totalLatencyMs === 'number') withoutRagLatency.push(totalLatencyMs);
      withoutRagTokens.push(tokensTotal);
    }
  }

  const avgLatencyWithRag = avg(withRagLatency);
  const avgLatencyWithoutRag = avg(withoutRagLatency);
  const avgTokensWithRag = avg(withRagTokens);
  const avgTokensWithoutRag = avg(withoutRagTokens);

  const out = {
    tenant_id: tenantId,
    total_requests: rows.length,
    rag_on_requests: ragOnRequests,
    avg_latency_with_rag: avgLatencyWithRag,
    avg_latency_without_rag: avgLatencyWithoutRag,
    avg_tokens_with_rag: avgTokensWithRag,
    avg_tokens_without_rag: avgTokensWithoutRag,
    delta_latency:
      avgLatencyWithRag != null && avgLatencyWithoutRag != null
        ? Number((avgLatencyWithRag - avgLatencyWithoutRag).toFixed(2))
        : null,
    delta_tokens:
      avgTokensWithRag != null && avgTokensWithoutRag != null
        ? Number((avgTokensWithRag - avgTokensWithoutRag).toFixed(2))
        : null,
  };

  console.log('RAG_IMPACT', JSON.stringify(out, null, 2));
} finally {
  await conn.end();
}
