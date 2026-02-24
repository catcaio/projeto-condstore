#!/usr/bin/env node

/**
 * Frank Gate Helper Script
 *
 * Usage:
 *   node scripts/check-frank-gate.mjs \
 *     --base-url http://localhost:3000 \
 *     --tenant-id mycompany \
 *     --baseline frank-v1.0.0 \
 *     --candidate frank-v2.0.0 \
 *     --hours 24 \
 *     --token "YOUR_INTERNAL_TOKEN"
 *
 * Environment variables (fallback):
 *   FRANK_GATE_BASE_URL (default: http://localhost:3000)
 *   FRANK_GATE_TENANT_ID (required)
 *   FRANK_GATE_BASELINE (required)
 *   FRANK_GATE_CANDIDATE (required)
 *   FRANK_GATE_TOKEN (required)
 */

import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  options: {
    'base-url': { type: 'string' },
    'tenant-id': { type: 'string' },
    baseline: { type: 'string' },
    candidate: { type: 'string' },
    hours: { type: 'string' },
    token: { type: 'string' },
    help: { type: 'boolean' },
  },
  allowPositionals: true,
});

if (values.help) {
  console.log(`
Frank Gate Helper — Evaluate rollout safety

Usage:
  node scripts/check-frank-gate.mjs \\
    --base-url http://localhost:3000 \\
    --tenant-id mycompany \\
    --baseline frank-v1.0.0 \\
    --candidate frank-v2.0.0 \\
    --hours 24 \\
    --token "YOUR_TOKEN"

Env vars (fallback):
  FRANK_GATE_BASE_URL
  FRANK_GATE_TENANT_ID
  FRANK_GATE_BASELINE
  FRANK_GATE_CANDIDATE
  FRANK_GATE_HOURS
  FRANK_GATE_TOKEN
  `);
  process.exit(0);
}

const config = {
  baseUrl: values['base-url'] || process.env.FRANK_GATE_BASE_URL || 'http://localhost:3000',
  tenantId: values['tenant-id'] || process.env.FRANK_GATE_TENANT_ID,
  baseline: values.baseline || process.env.FRANK_GATE_BASELINE,
  candidate: values.candidate || process.env.FRANK_GATE_CANDIDATE,
  hours: values.hours || process.env.FRANK_GATE_HOURS || '24',
  token: values.token || process.env.FRANK_GATE_TOKEN,
};

// Validate
const missing = [];
if (!config.tenantId) missing.push('--tenant-id or FRANK_GATE_TENANT_ID');
if (!config.baseline) missing.push('--baseline or FRANK_GATE_BASELINE');
if (!config.candidate) missing.push('--candidate or FRANK_GATE_CANDIDATE');
if (!config.token) missing.push('--token or FRANK_GATE_TOKEN');

if (missing.length > 0) {
  console.error(`❌ Missing required parameters: ${missing.join(', ')}`);
  console.error(`\nRun with --help for usage information`);
  process.exit(1);
}

async function checkGate() {
  const url = new URL('/api/internal/frank/gate', config.baseUrl);
  url.searchParams.set('tenantId', config.tenantId);
  url.searchParams.set('baseline', config.baseline);
  url.searchParams.set('candidate', config.candidate);
  url.searchParams.set('sinceHours', config.hours);

  console.log(`\n📋 Frank Gate Check`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`URL: ${url.toString()}`);
  console.log(`Tenant: ${config.tenantId}`);
  console.log(`Baseline: ${config.baseline}`);
  console.log(`Candidate: ${config.candidate}`);
  console.log(`Window: ${config.hours}h`);
  console.log(`\n🚀 Sending request...`);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-internal-token': config.token,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`\n❌ Request failed: ${response.status}`);
      console.error(JSON.stringify(data, null, 2));
      process.exit(1);
    }

    if (!data.ok) {
      console.error(`\n❌ Gate evaluation failed`);
      console.error(`Error: ${data.error}`);
      process.exit(1);
    }

    console.log(`\n✅ Decision: ${data.decision}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    if (data.decision === 'PASS') {
      console.log(`🎉 PASS — Candidate is safe to rollout!`);
    } else if (data.decision === 'FAIL') {
      console.log(`🛑 FAIL — Candidate exceeds safety thresholds`);
    } else {
      console.log(`⚠️  INSUFFICIENT_DATA — Cannot make decision`);
    }

    if (data.reasons.length > 0) {
      console.log(`\n📌 Reasons:`);
      data.reasons.forEach((reason, i) => {
        console.log(`  ${i + 1}. ${reason}`);
      });
    }

    console.log(`\n📊 Thresholds:`);
    console.log(`  • Min Events: ${data.thresholds.minEvents}`);
    console.log(`  • Max Error Rate Delta: ${(data.thresholds.maxErrorRateDelta * 100).toFixed(2)}pp`);
    console.log(`  • Max Latency Delta: ${(data.thresholds.maxP95LatencyDeltaPct * 100).toFixed(2)}%`);
    console.log(`  • Max Tokens Delta: ${(data.thresholds.maxAvgTokensDeltaPct * 100).toFixed(2)}%`);

    console.log(`\n📈 Baseline Metrics:`);
    if (data.metrics.baseline) {
      console.log(`  • Events: ${data.metrics.baseline.count}`);
      console.log(`  • Avg Latency: ${data.metrics.baseline.avgLatencyMs?.toFixed(2) ?? 'N/A'}ms`);
      console.log(`  • Avg Tokens (Prompt): ${data.metrics.baseline.avgTokensPrompt?.toFixed(2) ?? 'N/A'}`);
      console.log(`  • Avg Tokens (Completion): ${data.metrics.baseline.avgTokensCompletion?.toFixed(2) ?? 'N/A'}`);
      console.log(`  • Error Rate: ${data.metrics.baseline.errorRate.toFixed(2)}%`);
    } else {
      console.log(`  ❌ No data`);
    }

    console.log(`\n📈 Candidate Metrics:`);
    if (data.metrics.candidate) {
      console.log(`  • Events: ${data.metrics.candidate.count}`);
      console.log(`  • Avg Latency: ${data.metrics.candidate.avgLatencyMs?.toFixed(2) ?? 'N/A'}ms`);
      console.log(`  • Avg Tokens (Prompt): ${data.metrics.candidate.avgTokensPrompt?.toFixed(2) ?? 'N/A'}`);
      console.log(`  • Avg Tokens (Completion): ${data.metrics.candidate.avgTokensCompletion?.toFixed(2) ?? 'N/A'}`);
      console.log(`  • Error Rate: ${data.metrics.candidate.errorRate.toFixed(2)}%`);
    } else {
      console.log(`  ❌ No data`);
    }

    console.log(`\n⏰ Timestamp: ${data.timestamp}`);
    console.log();

    process.exit(data.decision === 'PASS' ? 0 : 1);
  } catch (error) {
    console.error(`\n❌ Request error: ${error.message}`);
    process.exit(1);
  }
}

checkGate();
