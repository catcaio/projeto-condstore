#!/usr/bin/env node

/**
 * Frank Rollback Helper Script
 *
 * Usage:
 *   node scripts/apply-frank-rollback.mjs \
 *     --base-url http://localhost:3000 \
 *     --tenant-id mycompany \
 *     --baseline frank-v1.0.0 \
 *     --candidate frank-v2.0.0 \
 *     --hours 24 \
 *     --token "YOUR_INTERNAL_TOKEN" \
 *     [--dry-run]
 *
 * Environment variables (fallback):
 *   FRANK_ROLLBACK_BASE_URL (default: http://localhost:3000)
 *   FRANK_ROLLBACK_TENANT_ID (required)
 *   FRANK_ROLLBACK_BASELINE (required)
 *   FRANK_ROLLBACK_CANDIDATE (required)
 *   FRANK_ROLLBACK_TOKEN (required)
 *   FRANK_ROLLBACK_HOURS (default: 24)
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
    'dry-run': { type: 'boolean' },
    help: { type: 'boolean' },
  },
  allowPositionals: true,
});

if (values.help) {
  console.log(`
Frank Rollback Helper — Apply automatic rollback when gate fails

Usage:
  node scripts/apply-frank-rollback.mjs \\
    --base-url http://localhost:3000 \\
    --tenant-id mycompany \\
    --baseline frank-v1.0.0 \\
    --candidate frank-v2.0.0 \\
    --hours 24 \\
    --token "YOUR_TOKEN" \\
    [--dry-run]

Env vars (fallback):
  FRANK_ROLLBACK_BASE_URL
  FRANK_ROLLBACK_TENANT_ID
  FRANK_ROLLBACK_BASELINE
  FRANK_ROLLBACK_CANDIDATE
  FRANK_ROLLBACK_HOURS
  FRANK_ROLLBACK_TOKEN

Flags:
  --dry-run    Simulate rollback without persisting changes
  `);
  process.exit(0);
}

const config = {
  baseUrl: values['base-url'] || process.env.FRANK_ROLLBACK_BASE_URL || 'http://localhost:3000',
  tenantId: values['tenant-id'] || process.env.FRANK_ROLLBACK_TENANT_ID,
  baseline: values.baseline || process.env.FRANK_ROLLBACK_BASELINE,
  candidate: values.candidate || process.env.FRANK_ROLLBACK_CANDIDATE,
  hours: values.hours || process.env.FRANK_ROLLBACK_HOURS || '24',
  token: values.token || process.env.FRANK_ROLLBACK_TOKEN,
  dryRun: values['dry-run'] === true,
};

// Validate
const missing = [];
if (!config.tenantId) missing.push('--tenant-id or FRANK_ROLLBACK_TENANT_ID');
if (!config.baseline) missing.push('--baseline or FRANK_ROLLBACK_BASELINE');
if (!config.candidate) missing.push('--candidate or FRANK_ROLLBACK_CANDIDATE');
if (!config.token) missing.push('--token or FRANK_ROLLBACK_TOKEN');

if (missing.length > 0) {
  console.error(`❌ Missing required parameters: ${missing.join(', ')}`);
  console.error(`\nRun with --help for usage information`);
  process.exit(1);
}

async function applyRollback() {
  const url = new URL('/api/internal/frank/apply-rollback', config.baseUrl);

  const body = {
    tenantId: config.tenantId,
    baseline: config.baseline,
    candidate: config.candidate,
    sinceHours: parseInt(config.hours, 10),
    dryRun: config.dryRun,
  };

  console.log(`\n🔄 Frank Rollback Request`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`URL: ${url.toString()}`);
  console.log(`Tenant: ${config.tenantId}`);
  console.log(`Baseline: ${config.baseline}`);
  console.log(`Candidate: ${config.candidate}`);
  console.log(`Window: ${config.hours}h`);
  console.log(`Dry-run: ${config.dryRun}`);
  console.log(`\n🚀 Sending request...`);

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': config.token,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`\n❌ Request failed: ${response.status}`);
      console.error(`Error: ${data.error}`);
      process.exit(1);
    }

    if (!data.ok) {
      console.error(`\n⚠️  Rollback rejected`);
      console.error(`Reason: ${data.error}`);
      process.exit(1);
    }

    console.log(`\n✅ Gate Decision: ${data.decision}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    if (data.decision === 'FAIL') {
      console.log(`🎯 FAILED — Rollback triggered`);
    } else {
      console.log(`ℹ️  Decision: ${data.decision}`);
    }

    if (data.reasons.length > 0) {
      console.log(`\n📌 Reasons:`);
      data.reasons.forEach((reason, i) => {
        console.log(`  ${i + 1}. ${reason}`);
      });
    }

    console.log(`\n📋 Rollback Details:`);
    console.log(`  • Previous Override: ${data.previousOverride || '(none)'}`);
    console.log(`  • New Override: ${data.newOverride || '(none, using default)'}`);
    console.log(`  • Applied: ${data.applied ? 'Yes' : 'No'}`);
    if (data.dryRun) {
      console.log(`  • ⚠️  DRY-RUN MODE (not persisted)`);
    }

    console.log(`\n⏰ Timestamp: ${data.timestamp}`);
    console.log();

    process.exit(data.applied ? 0 : 1);
  } catch (error) {
    console.error(`\n❌ Request error: ${error.message}`);
    process.exit(1);
  }
}

applyRollback();
