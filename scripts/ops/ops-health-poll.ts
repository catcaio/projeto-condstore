export {}; // Module isolation — prevents global scope collision during Next.js build

/**
 * ops-health-poll.ts — Automated health endpoint polling
 *
 * Polls all Condstore OS health endpoints and outputs consolidated JSON report.
 * Designed for go-live monitoring. Run periodically during the 2h/48h windows.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/ops/ops-health-poll.ts
 *   node --env-file=.env.local --import tsx scripts/ops/ops-health-poll.ts --loop 60
 */

const BASE_URL = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
const INTERNAL_TOKEN = process.env.SEED_TOKEN || '';

interface HealthResult {
  endpoint: string;
  status: number;
  ok: boolean;
  latencyMs: number;
  data: Record<string, unknown>;
  error?: string;
}

async function checkEndpoint(path: string, useAuth: boolean): Promise<HealthResult> {
  const url = `${BASE_URL}${path}`;
  const start = Date.now();

  try {
    const headers: Record<string, string> = {};
    if (useAuth && INTERNAL_TOKEN) {
      headers['x-internal-token'] = INTERNAL_TOKEN;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeout);

    const latencyMs = Date.now() - start;
    const data = await res.json().catch(() => ({}));

    return {
      endpoint: path,
      status: res.status,
      ok: res.status === 200,
      latencyMs,
      data: data as Record<string, unknown>,
    };
  } catch (err) {
    return {
      endpoint: path,
      status: 0,
      ok: false,
      latencyMs: Date.now() - start,
      data: {},
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function runHealthPoll(): Promise<void> {
  const timestamp = new Date().toISOString();

  const results = await Promise.all([
    checkEndpoint('/api/health', false),
    checkEndpoint('/api/internal/health/db', true),
    checkEndpoint('/api/internal/health/redis', true),
    checkEndpoint('/api/internal/health/webhook', true),
  ]);

  const allOk = results.every((r) => r.ok);

  const report = {
    timestamp,
    baseUrl: BASE_URL,
    allOk,
    results,
    summary: {
      total: results.length,
      passed: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
    },
  };

  console.log(JSON.stringify(report, null, 2));

  // Print human-readable summary
  console.log('\n--- Health Poll Summary ---');
  console.log(`Timestamp: ${timestamp}`);
  console.log(`Base URL:  ${BASE_URL}`);
  console.log(`Status:    ${allOk ? '✅ ALL OK' : '❌ DEGRADED'}`);
  console.log('');

  for (const r of results) {
    const icon = r.ok ? '✅' : '❌';
    console.log(`  ${icon} ${r.endpoint} — ${r.status} (${r.latencyMs}ms)${r.error ? ` ERROR: ${r.error}` : ''}`);
  }

  if (!allOk) {
    console.log('\n⚠️  ATENÇÃO: Um ou mais endpoints estão degradados!');
    process.exitCode = 1;
  }
}

// --- Main ---

const args = process.argv.slice(2);
const loopIndex = args.indexOf('--loop');

if (loopIndex !== -1) {
  const intervalSec = parseInt(args[loopIndex + 1] || '60', 10);
  console.log(`Starting continuous poll every ${intervalSec}s. Press Ctrl+C to stop.\n`);

  const poll = async () => {
    await runHealthPoll();
    console.log(`\n--- Next poll in ${intervalSec}s ---\n`);
  };

  void poll();
  setInterval(() => void poll(), intervalSec * 1000);
} else {
  void runHealthPoll();
}
