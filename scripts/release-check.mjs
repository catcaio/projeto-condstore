#!/usr/bin/env node

/**
 * release-check.mjs - Pre-release validation checklist
 *
 * Runs in ~2min on CI (no server, no db required):
 * 1. npm run typecheck      (TypeScript validation)
 * 2. npm run build          (production build without DATABASE_URL)
 * 3. ready-to-train         (dataset + replay in fast mode)
 *
 * Exit: 0 on PASS, 1 on FAIL
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STEPS = [
  {
    name: 'TypeScript Check',
    cmd: 'npm',
    args: ['run', 'typecheck'],
  },
  {
    name: 'Production Build',
    cmd: 'npm',
    args: ['run', 'build'],
    env: {
      NODE_ENV: 'production',
      DATABASE_URL: '',
    },
  },
  {
    name: 'Dataset & Replay (Fast)',
    cmd: 'node',
    args: [path.join(__dirname, 'ready-to-train.mjs')],
    env: {
      READY_START_SERVER: 'false',
      READY_TO_TRAIN_EXPORT_LIMIT: '10',
      READY_TO_TRAIN_REPLAY_LIMIT: '5',
    },
  },
];

let passed = 0;
let failed = 0;

console.log('╔════════════════════════════════════════╗');
console.log('║      RELEASE CHECK (FAST MODE)         ║');
console.log('╚════════════════════════════════════════╝\n');

for (const step of STEPS) {
  process.stdout.write(`→ ${step.name}... `);
  const startTime = Date.now();

  const result = spawnSync(step.cmd, step.args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...step.env,
    },
    shell: process.platform === 'win32',
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  if (result.status === 0) {
    console.log(`✓ (${duration}s)`);
    passed += 1;
  } else {
    console.log(`✗ (exit code: ${result.status})`);
    failed += 1;
  }
}

console.log('\n╔════════════════════════════════════════╗');
if (failed === 0) {
  console.log('║       ✓ RELEASE_CHECK_PASS             ║');
  console.log('╚════════════════════════════════════════╝');
  process.exit(0);
} else {
  console.log(`║  ✗ RELEASE_CHECK_FAIL (${failed} step${failed === 1 ? '' : 's'} failed) ║`);
  console.log('╚════════════════════════════════════════╝');
  process.exit(1);
}
