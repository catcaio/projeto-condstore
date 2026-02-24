import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (value && !value.startsWith('--')) {
      out[key] = value;
      i += 1;
    } else {
      out[key] = 'true';
    }
  }
  return out;
}

function nowStamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function getGitShortHash() {
  try {
    const headPath = path.resolve('.git', 'HEAD');
    const head = fs.readFileSync(headPath, 'utf8').trim();
    if (head.startsWith('ref: ')) {
      const ref = head.slice(5).trim();
      const refPath = path.resolve('.git', ref);
      if (fs.existsSync(refPath)) {
        const commit = fs.readFileSync(refPath, 'utf8').trim();
        if (commit) return commit.slice(0, 7);
      }
    } else if (/^[0-9a-f]{40}$/i.test(head)) {
      return head.slice(0, 7);
    }
  } catch {
    // Fallback to git command below.
  }
  const res = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    shell: process.platform === 'win32',
  });
  if (res.status === 0) {
    const hash = String(res.stdout || '').trim();
    if (hash) return hash;
  }
  return 'unknown';
}

function runCommand(stepName, command, args, options = {}) {
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });
  const durationMs = Date.now() - startedAt;

  if (result.error) {
    const err = new Error(`${stepName} spawn failed: ${result.error.message}`);
    err.stepName = stepName;
    err.exitCode = null;
    err.durationMs = durationMs;
    throw err;
  }

  if (result.status !== 0) {
    const err = new Error(`${stepName} failed (${command} ${args.join(' ')})`);
    err.stepName = stepName;
    err.exitCode = result.status ?? null;
    err.durationMs = durationMs;
    throw err;
  }

  return { durationMs };
}

function runBuildStep(npmCmd, { distDirBase = '.next-ready' } = {}) {
  const baseEnv = {
    ...process.env,
    NODE_ENV: 'production',
  };

  try {
    const first = runCommand('build', npmCmd, ['run', 'build'], {
      env: {
        ...baseEnv,
        NEXT_DIST_DIR: `${distDirBase}-tb`,
      },
    });
    return { ...first, strategy: 'turbopack' };
  } catch (firstError) {
    const retry = runCommand('build', npmCmd, ['run', 'build', '--', '--webpack'], {
      env: {
        ...baseEnv,
        NEXT_DIST_DIR: `${distDirBase}-wp`,
      },
    });
    return {
      ...retry,
      strategy: 'webpack_retry',
      retriedAfter: firstError instanceof Error ? firstError.message : String(firstError),
    };
  }
}

async function httpJsonCheck(stepName, url, { headers } = {}) {
  const startedAt = Date.now();
  let res;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers,
    });
  } catch (error) {
    const err = new Error(`${stepName} request failed: ${String(error?.message ?? error)}`);
    err.stepName = stepName;
    throw err;
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  const durationMs = Date.now() - startedAt;
  if (!res.ok || body?.ok !== true) {
    const err = new Error(`${stepName} unhealthy`);
    err.stepName = stepName;
    err.status = res.status;
    err.body = body;
    err.durationMs = durationMs;
    throw err;
  }

  return { durationMs, status: res.status, body };
}

async function readJsonlLines(file) {
  const lines = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(file, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const raw of rl) {
    const line = raw.trim();
    if (line) lines.push(line);
  }
  return lines;
}

async function writeJsonlLines(file, lines) {
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  await fs.promises.writeFile(file, `${lines.join('\n')}${lines.length ? '\n' : ''}`, 'utf8');
}

function percentileApprox(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  const idx = Math.min(sorted.length - 1, Math.max(0, rank - 1));
  return sorted[idx];
}

async function summarizeReplay(file) {
  const rl = readline.createInterface({
    input: fs.createReadStream(file, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let total = 0;
  let okExact = 0;
  let okContains = 0;
  const latencies = [];
  const tokenTotals = [];

  for await (const raw of rl) {
    const line = raw.trim();
    if (!line) continue;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }

    total += 1;
    if (row?.eval?.exactOk === true) okExact += 1;
    if (row?.eval?.containsOk === true) okContains += 1;

    const latency =
      typeof row?.metrics?.latency_ms === 'number'
        ? row.metrics.latency_ms
        : (typeof row?.latencyMs === 'number' ? row.latencyMs : null);
    if (Number.isFinite(latency)) latencies.push(latency);

    let tokens = null;
    if (typeof row?.metrics?.tokens_total === 'number') {
      tokens = row.metrics.tokens_total;
    } else if (
      typeof row?.metrics?.tokens_prompt === 'number' &&
      typeof row?.metrics?.tokens_completion === 'number'
    ) {
      tokens = row.metrics.tokens_prompt + row.metrics.tokens_completion;
    }
    if (Number.isFinite(tokens)) tokenTotals.push(tokens);
  }

  const avgLatency = latencies.length
    ? Number((latencies.reduce((sum, n) => sum + n, 0) / latencies.length).toFixed(2))
    : null;
  const avgTokens = tokenTotals.length
    ? Number((tokenTotals.reduce((sum, n) => sum + n, 0) / tokenTotals.length).toFixed(2))
    : null;

  return {
    total,
    ok_exact: okExact,
    ok_contains: okContains,
    avg_latency_ms: avgLatency,
    p95_latency_ms: percentileApprox(latencies, 95),
    avg_tokens: avgTokens,
  };
}

function splitTrainEval(lines, replayLimit) {
  if (lines.length === 0) {
    throw new Error('Export produced empty dataset');
  }

  if (lines.length === 1) {
    return {
      trainLines: [lines[0]],
      evalLines: [lines[0]],
      replayLines: [lines[0]],
      duplicatedForEval: true,
    };
  }

  const evalCount = Math.max(1, Math.floor(lines.length * 0.2));
  const splitIndex = Math.max(1, lines.length - evalCount);
  const trainLines = lines.slice(0, splitIndex);
  const evalLines = lines.slice(splitIndex);
  const replayLines = evalLines.slice(0, Math.max(1, replayLimit));

  return {
    trainLines,
    evalLines,
    replayLines: replayLines.length > 0 ? replayLines : [lines[0]],
    duplicatedForEval: false,
  };
}

function parseJsonSafe(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const gitHash = getGitShortHash();
  const timestamp = nowStamp();
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const nodeCmd = process.execPath;

  const tenantId = args.tenantId ?? process.env.READY_TO_TRAIN_TENANT_ID ?? 'lojacond-default';
  const appBaseUrl = args.baseUrl ?? process.env.INTERNAL_EXPORT_BASE_URL ?? 'http://127.0.0.1:3000';
  const internalToken = process.env.INTERNAL_EXPORT_TOKEN ?? '';
  const exportLimit = Math.max(1, Number.parseInt(args.exportLimit ?? process.env.READY_TO_TRAIN_EXPORT_LIMIT ?? '50', 10) || 50);
  const replayLimit = Math.max(1, Number.parseInt(args.replayLimit ?? process.env.READY_TO_TRAIN_REPLAY_LIMIT ?? '20', 10) || 20);
  const replayConcurrency = Math.max(1, Number.parseInt(args.replayConcurrency ?? process.env.READY_TO_TRAIN_REPLAY_CONCURRENCY ?? '2', 10) || 2);
  const replayBaseUrl = args.replayBaseUrl ?? process.env.DEFAULT_LMSTUDIO_BASE_URL ?? 'http://127.0.0.1:1234/v1';
  const replayModel = args.replayModel ?? process.env.DEFAULT_LMSTUDIO_MODEL ?? 'qwen2.5-7b-instruct-1m';
  const datasetVersion = args.datasetVersion ?? process.env.DATASET_VERSION ?? 'frank-events/v1';

  const datasetsRoot = path.resolve('datasets');
  const trainDir = path.join(datasetsRoot, 'train');
  const evalDir = path.join(datasetsRoot, 'eval');
  const replayDir = path.join(datasetsRoot, 'replay');
  const baselinesDir = path.join(replayDir, 'baselines');
  await Promise.all([
    fs.promises.mkdir(trainDir, { recursive: true }),
    fs.promises.mkdir(evalDir, { recursive: true }),
    fs.promises.mkdir(replayDir, { recursive: true }),
    fs.promises.mkdir(baselinesDir, { recursive: true }),
  ]);

  const artifactBase = `${timestamp}-${gitHash}`;
  const exportRawPath = path.join(trainDir, `${artifactBase}-export.ndjson`);
  const trainPath = path.join(trainDir, `${artifactBase}-train.ndjson`);
  const evalPath = path.join(evalDir, `${artifactBase}-eval.ndjson`);
  const replayInputPath = path.join(replayDir, `${artifactBase}-replay-input.ndjson`);
  const replayOutputPath = path.join(replayDir, `${artifactBase}-replay-output.ndjson`);
  const baselinePath = path.join(baselinesDir, `${artifactBase}.json`);

  const report = {
    status: 'PASS',
    git: gitHash,
    timestamp,
    tenantId,
    steps: [],
    artifacts: {
      export_raw: exportRawPath,
      train: trainPath,
      eval: evalPath,
      replay_input: replayInputPath,
      replay_output: replayOutputPath,
      baseline: baselinePath,
    },
  };

  try {
    report.steps.push({ step: 'typecheck', ...(runCommand('typecheck', npmCmd, ['run', 'typecheck'])) });
    report.steps.push({ step: 'build', ...runBuildStep(npmCmd, { distDirBase: `.next-ready-${timestamp}` }) });

    report.steps.push({
      step: 'health_db',
      ...(await httpJsonCheck('health_db', new URL('/api/internal/health/db', appBaseUrl).toString())),
    });
    report.steps.push({
      step: 'health_ai',
      ...(await httpJsonCheck('health_ai', new URL('/api/internal/health/ai', appBaseUrl).toString())),
    });
    report.steps.push({
      step: 'health_qdrant',
      ...(await httpJsonCheck('health_qdrant', new URL('/api/internal/health/qdrant', appBaseUrl).toString())),
    });

    if (!internalToken) {
      throw new Error('INTERNAL_EXPORT_TOKEN is required for export step');
    }

    report.steps.push({
      step: 'export_ndjson',
      ...runCommand(
        'export_ndjson',
        nodeCmd,
        [
          'scripts/export-frank-events.mjs',
          tenantId,
          '-',
          '-',
          exportRawPath,
          '--dataset-version',
          datasetVersion,
          '--app-version',
          gitHash,
          '--model-id',
          replayModel,
          '--embed-model-id',
          process.env.DEFAULT_EMBED_MODEL ?? replayModel,
        ],
        {
          env: {
            ...process.env,
            INTERNAL_EXPORT_BASE_URL: appBaseUrl,
            INTERNAL_EXPORT_TOKEN: internalToken,
            EXPORT_LIMIT: String(exportLimit),
          },
        },
      ),
    });

    const exportedLines = await readJsonlLines(exportRawPath);
    const split = splitTrainEval(exportedLines, replayLimit);
    await writeJsonlLines(trainPath, split.trainLines);
    await writeJsonlLines(evalPath, split.evalLines);
    await writeJsonlLines(replayInputPath, split.replayLines);
    report.steps.push({
      step: 'split_datasets',
      total: exportedLines.length,
      train: split.trainLines.length,
      eval: split.evalLines.length,
      replay: split.replayLines.length,
      duplicatedForEval: split.duplicatedForEval,
    });

    const firstRow = parseJsonSafe(exportedLines[0]);
    if (!firstRow?.dataset_version || !firstRow?.app_version || !('model_id' in firstRow) || !('embed_model_id' in firstRow)) {
      throw new Error('Export NDJSON missing version metadata fields');
    }
    report.steps.push({
      step: 'verify_export_versioning',
      dataset_version: firstRow.dataset_version,
      app_version: firstRow.app_version,
      model_id: firstRow.model_id ?? null,
      embed_model_id: firstRow.embed_model_id ?? null,
    });

    report.steps.push({
      step: 'validate_dataset_safety',
      ...runCommand(
        'validate_dataset_safety',
        nodeCmd,
        ['scripts/validate-dataset-safety.mjs', trainPath, '--require-frank-fields'],
      ),
    });

    report.steps.push({
      step: 'replay',
      ...runCommand(
        'replay',
        nodeCmd,
        [
          'scripts/replay-frank.mjs',
          '--in', replayInputPath,
          '--out', replayOutputPath,
          '--baseUrl', replayBaseUrl,
          '--model', replayModel,
          '--limit', String(replayLimit),
          '--concurrency', String(replayConcurrency),
        ],
      ),
    });

    const baselineSummary = await summarizeReplay(replayOutputPath);
    const baselinePayload = {
      ...baselineSummary,
      tenant_id: tenantId,
      dataset_version: firstRow.dataset_version ?? datasetVersion,
      app_version: firstRow.app_version ?? gitHash,
      model_id: replayModel,
      embed_model_id: process.env.DEFAULT_EMBED_MODEL ?? replayModel,
      replay_input_path: replayInputPath,
      replay_output_path: replayOutputPath,
      generated_at: new Date().toISOString(),
      git: gitHash,
    };
    await fs.promises.writeFile(baselinePath, `${JSON.stringify(baselinePayload, null, 2)}\n`, 'utf8');
    report.steps.push({ step: 'baseline_summary', ...baselineSummary, baselinePath });

    console.log('READY_TO_TRAIN_PASS', JSON.stringify(report, null, 2));
  } catch (error) {
    report.status = 'FAIL';
    report.error = {
      message: error instanceof Error ? error.message : String(error),
      step: error?.stepName ?? null,
      exitCode: error?.exitCode ?? null,
      status: error?.status ?? null,
      body: error?.body ?? null,
    };
    console.error('READY_TO_TRAIN_FAIL', JSON.stringify(report, null, 2));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('READY_TO_TRAIN_FATAL', error);
  process.exit(1);
});
