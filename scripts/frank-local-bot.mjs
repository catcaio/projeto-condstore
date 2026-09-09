#!/usr/bin/env node
/**
 * Frank local validation bot.
 *
 * Runs the Frank execution runtime checks locally without DB or network:
 *  1. ensures dependencies (npm ci when node_modules is missing),
 *  2. runs the FRK-9 execution test-suite (in-memory store, no DB),
 *  3. typechecks the touched scope,
 *  4. prints a structured PASS/FAIL verdict.
 *
 * Usage: npm run frank:bot
 * Exit codes: 0 = all green, 1 = failure (see verdict JSON on stdout).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const log = (msg) => console.log(`[frank-bot] ${msg}`);
const verdict = { steps: {}, ok: false };

function run(cmd, args, { timeoutMs = 600000 } = {}) {
  const started = Date.now();
  const proc = spawnSync(cmd, args, {
    encoding: 'utf8',
    timeout: timeoutMs,
    shell: process.platform === 'win32',
  });
  return {
    exitCode: proc.status ?? -1,
    durationMs: Date.now() - started,
    tail: String(proc.stdout || proc.stderr || '').slice(-1500),
  };
}

const steps = [];
if (!existsSync('node_modules')) {
  log('node_modules ausente — instalando (pode demorar)...');
  steps.push(['install', () => run('npm', ['ci', '--no-audit', '--no-fund'])]);
} else {
  log('node_modules presente — pulando install.');
}
steps.push(['frank-tests', () => {
  // Scoped config generated at runtime: the project vitest config does not
  // include src/**, and the Windows EPERM workaround file is missing on some
  // checkouts — handled here so the bot works on any branch.
  const root = process.cwd().replace(/\\/g, '/');
    // Config must live inside the project so `vitest/config` resolves.
    const cfgPath = path.join(root, 'vitest.frank.local.config.ts');
  writeFileSync(
    cfgPath,
    'import { defineConfig } from "vitest/config";\n' +
      `export default defineConfig({ root: ${JSON.stringify(root)}, resolve: { alias: { "@": ${JSON.stringify(root + '/src')} } }, test: { environment: "node", include: ["src/modules/frank/execution/__tests__/**/*.test.ts"] } });\n`,
  );
  const env = { ...process.env, VITEST_POOL: 'forks' };
  if (existsSync('scripts/vitest-windows-eperm-workaround.cjs')) {
    env.ESBUILD_BINARY_PATH = 'node_modules/vite/node_modules/@esbuild/win32-x64/esbuild.exe';
    env.NODE_OPTIONS = '--require=./scripts/vitest-windows-eperm-workaround.cjs';
  }
  const proc = spawnSync('npx', ['vitest', 'run', '--config', cfgPath], {
    encoding: 'utf8',
    timeout: 420000,
    shell: process.platform === 'win32',
    env,
  });
  try { unlinkSync(cfgPath); } catch { /* best effort */ }
  return {
    exitCode: proc.status ?? -1,
    durationMs: 0,
    tail: String(proc.stdout || proc.stderr || '').slice(-1500),
  };
}]);
steps.push(['typecheck-scope', () =>
  run('npx', ['tsc', '-p', 'tsconfig.build.json', '--noEmit'], { timeoutMs: 600000 })]);

let failed = null;
for (const [name, fn] of steps) {
  log(`etapa: ${name}...`);
  const result = fn();
  verdict.steps[name] = result;
  log(`etapa ${name}: exit=${result.exitCode} em ${result.durationMs}ms`);
  if (result.exitCode !== 0) {
    failed = name;
    break;
  }
}
verdict.ok = failed === null;
console.log(JSON.stringify({ ok: verdict.ok, failedStep: failed, steps: verdict.steps }, null, 2));
process.exit(verdict.ok ? 0 : 1);
