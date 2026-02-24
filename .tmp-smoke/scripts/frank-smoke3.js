/**
 * frank-smoke3.js — Diagnostic smoke test for provider.chat hang
 *
 * Tests each layer of the Frank call stack in isolation so we can identify
 * exactly where the latency / hang occurs.
 *
 * Usage (PowerShell):
 *   $env:LMSTUDIO_BASE_URL = "http://127.0.0.1:1234/v1"
 *   $env:LMSTUDIO_MODEL    = "qwen2.5-7b-instruct-1m"
 *   node .\.tmp-smoke\scripts\frank-smoke3.js [tenantId]
 *
 * Usage (bash):
 *   LMSTUDIO_BASE_URL=http://127.0.0.1:1234/v1 \
 *   LMSTUDIO_MODEL=qwen2.5-7b-instruct-1m \
 *   node .tmp-smoke/scripts/frank-smoke3.js lojacond-default
 *
 * Each step is timed independently so we can see:
 *   - Step 1: Direct LM Studio HTTP (no gateway overhead)   → confirms LM Studio is up
 *   - Step 2: Rate-limit Redis check                        → isolates Redis latency
 *   - Step 3: Full provider.chat via the real llm-gateway   → measures total overhead
 *
 * Constraints from the diagnostic session:
 *   - No custom module loaders (uses plain node fetch — no ts-node)
 *   - No process.kill / setTimeout-based kill
 *   - No DB writes — all queries are SELECT only (via getProviderConfig)
 *   - Output is plain JSON-per-line so it can be piped / grepped
 */

'use strict';

const tenantId = process.argv[2] || 'lojacond-default';
const BASE_URL  = process.env.LMSTUDIO_BASE_URL || process.env.DEFAULT_LMSTUDIO_BASE_URL || 'http://127.0.0.1:1234/v1';
const MODEL     = process.env.LMSTUDIO_MODEL    || process.env.DEFAULT_LMSTUDIO_MODEL    || 'qwen2.5-7b-instruct-1m';
const TIMEOUT   = Number(process.env.DEFAULT_AI_TIMEOUT_MS || '30000');
const TEST_MSG  = 'Qual o prazo de entrega para o CEP 01310-100?';

function log(step, status, latencyMs, detail) {
  const entry = {
    ts: new Date().toISOString(),
    step,
    status,
    latency_ms: latencyMs,
    ...(detail ? { detail } : {}),
  };
  console.log(JSON.stringify(entry));
}

// ── Step 1: Direct LM Studio HTTP call ───────────────────────────────────────
async function step1_directLmStudio() {
  const url = `${BASE_URL}/chat/completions`;
  const body = JSON.stringify({
    model: MODEL,
    messages: [{ role: 'user', content: TEST_MSG }],
    max_tokens: 64,
  });

  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: ctrl.signal,
    });
    const text = await res.text();
    const latencyMs = Date.now() - t0;

    if (!res.ok) {
      log('1_direct_lmstudio', 'error', latencyMs, { http_status: res.status, body: text.slice(0, 200) });
      return false;
    }

    const data = JSON.parse(text);
    const reply = data?.choices?.[0]?.message?.content ?? '(empty)';
    log('1_direct_lmstudio', 'ok', latencyMs, { reply: reply.slice(0, 120) });
    return true;
  } catch (err) {
    log('1_direct_lmstudio', 'error', Date.now() - t0, { error: err.message });
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// ── Step 2: Redis rate-limit check (isolated) ─────────────────────────────────
// We call the internal Redis INCR via a tiny in-process script so there is no
// full gateway bootstrap.  We rely on process.env.REDIS_URL being set or not.
async function step2_redisRateLimit() {
  // Dynamic import so the module gets fresh env (must match the app's setup).
  // NOTE: this requires Node ≥ 18 and the TS source to be compiled, OR for
  //       the project to expose a compiled dist.  In a raw node run we can only
  //       test if the Redis URL is reachable at the transport layer.

  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL || '';
  if (!redisUrl) {
    log('2_redis_ratelimit', 'skip', 0, { reason: 'REDIS_URL not set — in-memory fallback will be used; no hang expected' });
    return true;
  }

  // Try a raw TCP connect (no ioredis) to measure TCP latency to Redis host.
  const { hostname, port: portStr } = new URL(redisUrl.startsWith('redis') ? redisUrl : `redis://${redisUrl}`);
  const port = Number(portStr) || 6379;

  const t0 = Date.now();
  const result = await new Promise((resolve) => {
    const net = require('net');
    const sock = net.createConnection({ host: hostname, port }, () => {
      const latencyMs = Date.now() - t0;
      sock.destroy();
      resolve({ ok: true, latencyMs });
    });
    sock.setTimeout(5000);
    sock.on('timeout', () => { sock.destroy(); resolve({ ok: false, latencyMs: Date.now() - t0, reason: 'TCP_TIMEOUT' }); });
    sock.on('error',   (e) => { resolve({ ok: false, latencyMs: Date.now() - t0, reason: e.message }); });
  });

  if (result.ok) {
    log('2_redis_ratelimit', 'reachable', result.latencyMs, { host: hostname, port });
  } else {
    log('2_redis_ratelimit', 'unreachable', result.latencyMs, {
      host: hostname, port, reason: result.reason,
      impact: 'isAvailable() was returning true here BEFORE the fix; each Redis op blocked for ~10 s (connectTimeout × 2) before falling back to in-memory store',
    });
  }
  return result.ok;
}

// ── Step 3: Full provider.chat via gateway HTTP (app must be running) ─────────
// We call the app's internal ops endpoint which proxies a Frank run.
// If the app isn't running locally this step is skipped gracefully.
async function step3_gatewayViaHttp() {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const endpoint = `${appUrl}/api/internal/ops`;

  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, message: TEST_MSG }),
      signal: ctrl.signal,
    });
    const latencyMs = Date.now() - t0;
    const text = await res.text();

    if (res.status === 404 || res.status === 405) {
      log('3_gateway_http', 'skip', latencyMs, { reason: 'app not running or endpoint not found' });
      return;
    }

    log('3_gateway_http', res.ok ? 'ok' : 'error', latencyMs, {
      http_status: res.status,
      body: text.slice(0, 200),
    });
  } catch (err) {
    const latencyMs = Date.now() - t0;
    if (err.name === 'AbortError') {
      log('3_gateway_http', 'timeout', latencyMs, {
        error: `Timed out after ${TIMEOUT} ms`,
        diagnosis: 'provider.chat is hanging — see redis / DB latency in steps 1-2',
      });
    } else {
      log('3_gateway_http', 'skip', latencyMs, { reason: err.message });
    }
  } finally {
    clearTimeout(timer);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.error(`[frank-smoke3] tenantId=${tenantId}  model=${MODEL}  timeout=${TIMEOUT}ms`);
  console.error(`[frank-smoke3] LM Studio base: ${BASE_URL}`);
  console.error('');

  const lmOk    = await step1_directLmStudio();
  const redisOk = await step2_redisRateLimit();
  await step3_gatewayViaHttp();

  console.error('');
  if (lmOk && redisOk) {
    console.error('[frank-smoke3] DIAGNOSIS: LM Studio + Redis both healthy — any remaining hang is in gateway overhead (DB query or in-memory rate-limit path)');
  } else if (lmOk && !redisOk) {
    console.error('[frank-smoke3] DIAGNOSIS: LM Studio OK but Redis UNREACHABLE');
    console.error('  Before fix: isAvailable() returned true → every rate-limit check blocked ~10 s');
    console.error('  After fix:  isAvailable() returns false → immediate in-memory fallback, no hang');
  } else if (!lmOk) {
    console.error('[frank-smoke3] DIAGNOSIS: LM Studio is the bottleneck — increase DEFAULT_AI_TIMEOUT_MS');
  }
})();
