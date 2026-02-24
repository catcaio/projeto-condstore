import fs from 'node:fs';
import readline from 'node:readline';

function percentileApprox(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  const idx = Math.min(sorted.length - 1, Math.max(0, rank - 1));
  return sorted[idx];
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: node scripts/summarize-replay.mjs <replay.jsonl>');
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(file, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let total = 0;
  let okExact = 0;
  let okContains = 0;
  let okStatus = 0;
  let errorStatus = 0;
  const latencies = [];

  for await (const line of rl) {
    if (!line || !line.trim()) continue;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }

    total += 1;
    if (row?.eval?.exactOk === true) okExact += 1;
    if (row?.eval?.containsOk === true) okContains += 1;
    if (row?.metrics?.status === 'ok') okStatus += 1;
    if (row?.metrics?.status === 'error') errorStatus += 1;

    const latency =
      typeof row?.metrics?.latency_ms === 'number'
        ? row.metrics.latency_ms
        : (typeof row?.latencyMs === 'number' ? row.latencyMs : null);
    if (latency !== null && Number.isFinite(latency)) {
      latencies.push(latency);
    }
  }

  const avgLatency = latencies.length > 0
    ? Number((latencies.reduce((sum, n) => sum + n, 0) / latencies.length).toFixed(2))
    : null;
  const p95Latency = percentileApprox(latencies, 95);

  console.log('REPLAY_SUMMARY', JSON.stringify({
    total,
    ok_exact: okExact,
    ok_contains: okContains,
    ok_status: okStatus,
    error_status: errorStatus,
    avg_latency_ms: avgLatency,
    p95_latency_ms: p95Latency,
  }, null, 2));
}

main().catch((error) => {
  console.error('SUMMARY_FATAL', error);
  process.exit(1);
});

