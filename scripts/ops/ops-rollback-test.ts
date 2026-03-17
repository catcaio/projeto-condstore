export {}; // Module isolation

/**
 * ops-rollback-test.ts — Rollback pre-condition validator
 *
 * Validates that all rollback mechanisms are ready before go-live.
 * Run this BEFORE deploying to production to ensure rollback is viable.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/ops/ops-rollback-test.ts
 */

import fs from 'fs';
import { execSync } from 'child_process';

interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

const checks: CheckResult[] = [];

function check(name: string, fn: () => string): void {
  try {
    const detail = fn();
    checks.push({ name, passed: true, detail });
  } catch (err) {
    checks.push({
      name,
      passed: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}

// --- Checks ---

// 1. Env backup exists
check('Local env backup exists (.env.vercel.production)', () => {
  const path = '.env.vercel.production';
  if (!fs.existsSync(path)) throw new Error('File not found. Run: npx vercel env pull .env.vercel.production --environment production');
  const content = fs.readFileSync(path, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  return `${lines.length} env vars backed up`;
});

// 2. Critical env vars in backup
check('Backup has DATABASE_URL', () => {
  const content = fs.readFileSync('.env.vercel.production', 'utf-8');
  if (!content.includes('DATABASE_URL=')) throw new Error('DATABASE_URL missing from backup');
  return 'Present';
});

check('Backup has TWILIO_AUTH_TOKEN', () => {
  const content = fs.readFileSync('.env.vercel.production', 'utf-8');
  if (!content.includes('TWILIO_AUTH_TOKEN=')) throw new Error('TWILIO_AUTH_TOKEN missing from backup');
  return 'Present';
});

check('Backup has STRIPE_WEBHOOK_SECRET', () => {
  const content = fs.readFileSync('.env.vercel.production', 'utf-8');
  if (!content.includes('STRIPE_WEBHOOK_SECRET=')) throw new Error('STRIPE_WEBHOOK_SECRET missing from backup');
  return 'Present';
});

// 3. Vercel CLI available
check('Vercel CLI available', () => {
  try {
    const version = execSync('npx vercel --version', { timeout: 15000 }).toString().trim();
    return `Version: ${version}`;
  } catch {
    throw new Error('Vercel CLI not available. Run: npm i -g vercel');
  }
});

// 4. Git state clean
check('Git working tree clean', () => {
  try {
    const status = execSync('git status --porcelain', { timeout: 5000 }).toString().trim();
    if (status.length > 0) {
      const files = status.split('\n').length;
      return `⚠️ ${files} uncommitted changes (not blocking but risky)`;
    }
    return 'Clean';
  } catch {
    throw new Error('Git not available');
  }
});

// 5. Current branch
check('Current git branch', () => {
  const branch = execSync('git branch --show-current', { timeout: 5000 }).toString().trim();
  return `Branch: ${branch}`;
});

// 6. Recent commits available for rollback
check('Recent commits available', () => {
  const log = execSync('git log --oneline -5', { timeout: 5000 }).toString().trim();
  const commits = log.split('\n').length;
  return `${commits} recent commits: ${log.split('\n')[0]}`;
});

// 7. Health check script exists
check('Health check script exists', () => {
  if (!fs.existsSync('scripts/check-health.ts')) throw new Error('scripts/check-health.ts not found');
  return 'Present';
});

// 8. Health poll script exists
check('Ops health poll script exists', () => {
  if (!fs.existsSync('scripts/ops/ops-health-poll.ts')) throw new Error('scripts/ops/ops-health-poll.ts not found');
  return 'Present';
});

// 9. deploy-env.mjs exists (env restore tool)
check('Env deploy script exists (deploy-env.mjs)', () => {
  if (!fs.existsSync('scripts/deploy-env.mjs')) throw new Error('scripts/deploy-env.mjs not found');
  return 'Present';
});

// 10. Rollback docs exist
check('Rollback plan documented', () => {
  if (!fs.existsSync('docs/ops/rollback-plan.md')) throw new Error('docs/ops/rollback-plan.md not found');
  return 'Present';
});

// 11. Worker files exist
check('All worker files present', () => {
  const workers = [
    'src/workers/finops-worker.ts',
    'src/workers/queue-worker.ts',
    'src/workers/quote-worker.ts',
    'src/workers/webhook-worker.ts',
  ];
  const missing = workers.filter((w) => !fs.existsSync(w));
  if (missing.length > 0) throw new Error(`Missing: ${missing.join(', ')}`);
  return `${workers.length} workers present`;
});

// 12. Frank runtime defaults to disabled
check('Frank runtime defaults to disabled', () => {
  const frankEnabled = process.env.FRANK_RUNTIME_ENABLED;
  if (frankEnabled === 'true') throw new Error('FRANK_RUNTIME_ENABLED=true — must be false for go-live');
  return `FRANK_RUNTIME_ENABLED=${frankEnabled || 'not set (defaults to false)'} ✅`;
});

// --- Report ---

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║       ROLLBACK PRE-CONDITION VALIDATOR               ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

const passed = checks.filter((c) => c.passed).length;
const failed = checks.filter((c) => !c.passed).length;

for (const c of checks) {
  const icon = c.passed ? '✅' : '❌';
  console.log(`${icon} ${c.name}`);
  console.log(`   ${c.detail}\n`);
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Result: ${passed} passed, ${failed} failed out of ${checks.length} checks`);

if (failed > 0) {
  console.log('\n⚠️  ROLLBACK NOT FULLY READY — fix failing checks before go-live');
  process.exitCode = 1;
} else {
  console.log('\n✅ ROLLBACK READY — all pre-conditions met');
}
