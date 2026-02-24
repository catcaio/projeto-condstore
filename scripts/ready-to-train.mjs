import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { spawn, spawnSync } from 'node:child_process';
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

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function randomSuffix(length = 6) {
  return Math.random().toString(36).slice(2, 2 + length);
}

function parseBool(value, defaultValue) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return defaultValue;
}

function safeInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildInternalHeaders(internalToken) {
  if (!internalToken) return undefined;
  return { 'x-internal-token': internalToken };
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

function runCommandCaptured(stepName, command, args, options = {}) {
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    stdio: ['inherit', 'pipe', 'pipe'],
    encoding: 'utf8',
    shell: process.platform === 'win32',
    ...options,
  });
  const durationMs = Date.now() - startedAt;

  if (typeof result.stdout === 'string' && result.stdout.length > 0) {
    process.stdout.write(result.stdout);
  }
  if (typeof result.stderr === 'string' && result.stderr.length > 0) {
    process.stderr.write(result.stderr);
  }

  if (result.error) {
    const err = new Error(`${stepName} spawn failed: ${result.error.message}`);
    err.stepName = stepName;
    err.exitCode = null;
    err.durationMs = durationMs;
    err.code = result.error.code ?? null;
    err.stdout = result.stdout ?? '';
    err.stderr = result.stderr ?? '';
    throw err;
  }

  if (result.status !== 0) {
    const err = new Error(`${stepName} failed (${command} ${args.join(' ')})`);
    err.stepName = stepName;
    err.exitCode = result.status ?? null;
    err.durationMs = durationMs;
    err.stdout = result.stdout ?? '';
    err.stderr = result.stderr ?? '';
    throw err;
  }

  return { durationMs, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function isEpermError(error) {
  const code = String(error?.code ?? '').toUpperCase();
  if (code === 'EPERM') return true;
  const text = [error?.message, error?.stdout, error?.stderr].filter(Boolean).join('\n');
  return /\bEPERM\b/i.test(text);
}

function getEpermReason(error) {
  const text = [error?.stderr, error?.stdout, error?.message].filter(Boolean).join('\n');
  const line = text
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => /\bEPERM\b/i.test(item));
  return line || (error instanceof Error ? error.message : String(error));
}

async function removeDirWithRetry(targetDir, { attempts = 3, baseDelayMs = 250 } = {}) {
  if (!fs.existsSync(targetDir)) return { removed: false, attempts: 0 };

  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await fs.promises.rm(targetDir, { recursive: true, force: true });
      console.log(`[ready-to-train] cleaned dist dir: ${targetDir} (attempt ${attempt}/${attempts})`);
      return { removed: true, attempts: attempt };
    } catch (error) {
      lastError = error;
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(
        `[ready-to-train] failed to remove dist dir ${targetDir} (attempt ${attempt}/${attempts}): ${reason}`,
      );
      if (attempt < attempts) {
        await sleep(baseDelayMs * attempt);
      }
    }
  }

  throw lastError;
}

async function restoreFileSnapshot(filePath, snapshot) {
  const existsNow = fs.existsSync(filePath);
  if (snapshot.exists) {
    const current = existsNow ? await fs.promises.readFile(filePath, 'utf8') : null;
    if (current !== snapshot.content) {
      await fs.promises.writeFile(filePath, snapshot.content, 'utf8');
      console.log(`[ready-to-train] restored ${filePath} after build`);
    }
    return;
  }

  if (existsNow) {
    await fs.promises.rm(filePath, { force: true });
    console.log(`[ready-to-train] removed generated ${filePath} after build`);
  }
}

async function withBuildFileProtection(fn) {
  const protectedFiles = ['tsconfig.json', 'next-env.d.ts'];
  const snapshots = await Promise.all(
    protectedFiles.map(async (filePath) => {
      const exists = fs.existsSync(filePath);
      return {
        filePath,
        exists,
        content: exists ? await fs.promises.readFile(filePath, 'utf8') : null,
      };
    }),
  );

  try {
    return await fn();
  } finally {
    for (const snapshot of snapshots) {
      try {
        await restoreFileSnapshot(snapshot.filePath, snapshot);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(`[ready-to-train] warning: failed to restore ${snapshot.filePath}: ${reason}`);
      }
    }
  }
}

async function bestEffortWindowsBuildUnlock() {
  if (process.platform !== 'win32') return;

  const cwdPs = process.cwd().replace(/'/g, "''");
  const psScript = [
    `$repo='${cwdPs}'`,
    `$selfPid=${process.pid}`,
    `$names=@('node.exe','next.exe','esbuild.exe')`,
    `$targets=@(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {`,
    `  $names -contains $_.Name -and $_.ProcessId -ne $selfPid -and $_.CommandLine -and ($_.CommandLine -like ('*' + $repo + '*'))`,
    `})`,
    `if ($targets.Count -eq 0) { Write-Output 'no matching build lock processes found' }`,
    `foreach ($p in $targets) {`,
    `  try {`,
    `    Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop`,
    `    Write-Output ('killed ' + $p.Name + ' #' + $p.ProcessId)`,
    `  } catch {`,
    `    Write-Output ('skip ' + $p.Name + ' #' + $p.ProcessId + ' - ' + $_.Exception.Message)`,
    `  }`,
    `}`,
  ].join('; ');

  console.log('[ready-to-train] Windows build prep: attempting to stop node.exe / next.exe / esbuild.exe (repo-scoped)');
  const res = spawnSync('powershell.exe', ['-NoProfile', '-Command', psScript], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });

  if (typeof res.stdout === 'string' && res.stdout.length > 0) process.stdout.write(res.stdout);
  if (typeof res.stderr === 'string' && res.stderr.length > 0) process.stderr.write(res.stderr);
  if (res.error) {
    console.warn(`[ready-to-train] Windows build prep warning: ${res.error.message}`);
  }

  await sleep(1500);
}

async function runBuildStep(npmCmd, { distDirBase = '.next-ready', skipWindowsProcessKill = false } = {}) {
  const baseEnv = {
    ...process.env,
    NODE_ENV: 'production',
  };

  return withBuildFileProtection(async () => {
    if (skipWindowsProcessKill) {
      console.log('[ready-to-train] Windows build prep: preserving existing target server (skip process kill)');
    } else {
      await bestEffortWindowsBuildUnlock();
    }

    const makeDistDir = () => `${distDirBase}-${randomSuffix(6)}`;
    let currentDistDir = makeDistDir();
    console.log(`[ready-to-train] build NEXT_DIST_DIR=${currentDistDir}`);
    await removeDirWithRetry(currentDistDir);

    const buildStartedAt = Date.now();
    const attempts = [];

    const tryBuild = async ({ attemptNo, strategy, args, distDir, extraEnv = {} }) => {
      console.log(
        `[ready-to-train] build attempt ${attemptNo}: strategy=${strategy} NEXT_DIST_DIR=${distDir}`,
      );
      await removeDirWithRetry(distDir);
      const result = runCommandCaptured('build', npmCmd, args, {
        env: {
          ...baseEnv,
          ...extraEnv,
          NEXT_DIST_DIR: distDir,
        },
      });
      attempts.push({
        attempt: attemptNo,
        strategy,
        distDir,
        status: 'ok',
        durationMs: result.durationMs,
      });
      return result;
    };

    const onAttemptError = (attemptNo, strategy, distDir, error) => {
      const epremDetected = isEpermError(error);
      const reason = epremDetected ? getEpermReason(error) : (error instanceof Error ? error.message : String(error));
      attempts.push({
        attempt: attemptNo,
        strategy,
        distDir,
        status: 'failed',
        eperm: epremDetected,
        durationMs: error?.durationMs ?? null,
        reason,
      });
      if (epremDetected) {
        console.warn(`[ready-to-train] EPERM detected on build attempt ${attemptNo}: ${reason}`);
      }
      return epremDetected;
    };

    const sequence = [
      { attemptNo: 1, strategy: 'turbopack', args: ['run', 'build'], useNewDistDir: false },
      { attemptNo: 2, strategy: 'turbopack_retry_same_dist', args: ['run', 'build'], useNewDistDir: false },
      { attemptNo: 3, strategy: 'turbopack_retry_new_dist', args: ['run', 'build'], useNewDistDir: true },
      {
        attemptNo: 4,
        strategy: 'webpack_retry_turbopack0',
        args: ['run', 'build', '--', '--webpack'],
        useNewDistDir: true,
        extraEnv: { TURBOPACK: '0' },
      },
    ];

    let lastError = null;
    let finalStrategy = null;
    let finalDistDir = currentDistDir;

    for (const step of sequence) {
      if (step.useNewDistDir) {
        currentDistDir = makeDistDir();
        console.log(`[ready-to-train] switching NEXT_DIST_DIR=${currentDistDir}`);
      }
      finalDistDir = currentDistDir;

      try {
        const result = await tryBuild({
          attemptNo: step.attemptNo,
          strategy: step.strategy,
          args: step.args,
          distDir: currentDistDir,
          extraEnv: step.extraEnv,
        });
        finalStrategy = step.strategy;
        return {
          durationMs: Date.now() - buildStartedAt,
          strategy: finalStrategy,
          nextDistDir: finalDistDir,
          attempts,
          lastAttemptDurationMs: result.durationMs,
        };
      } catch (error) {
        lastError = error;
        const epremDetected = onAttemptError(step.attemptNo, step.strategy, currentDistDir, error);
        if (!epremDetected) {
          error.attempts = attempts;
          throw error;
        }
        if (step.attemptNo === sequence.length) {
          break;
        }
      }
    }

    if (lastError) {
      lastError.attempts = attempts;
      lastError.hint = 'Feche npm run dev / VSCode / antivírus/OneDrive e tente novamente';
      console.error(lastError.hint);
      throw lastError;
    }

    throw new Error('build failed without error details');
  });
}

async function fetchJsonProbe(url, { headers, timeoutMs = 1500 } = {}) {
  const startedAt = Date.now();
  let controller = null;
  let timeout = null;
  if (typeof AbortController !== 'undefined') {
    controller = new AbortController();
    timeout = setTimeout(() => {
      try {
        controller.abort();
      } catch {
        // no-op
      }
    }, timeoutMs);
    if (typeof timeout?.unref === 'function') timeout.unref();
  }

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller?.signal,
    });
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return {
      reachable: true,
      ok: res.ok && body?.ok === true,
      status: res.status,
      body,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      reachable: false,
      ok: false,
      status: null,
      body: null,
      durationMs: Date.now() - startedAt,
      error,
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function httpJsonCheck(stepName, url, { headers, unauthorizedHint } = {}) {
  const startedAt = Date.now();
  const probe = await fetchJsonProbe(url, { headers });
  if (!probe.reachable) {
    const err = new Error(`${stepName} request failed: ${String(probe.error?.message ?? probe.error)}`);
    err.stepName = stepName;
    throw err;
  }
  const { status, body } = probe;
  const durationMs = Date.now() - startedAt;
  if (status === 401 && unauthorizedHint) {
    console.warn(`[ready-to-train] ${stepName} returned 401. ${unauthorizedHint}`);
  }
  if (status === null || body?.ok !== true) {
    const err = new Error(`${stepName} unhealthy`);
    err.stepName = stepName;
    err.status = status;
    err.body = body;
    err.durationMs = durationMs;
    if (status === 401 && unauthorizedHint) {
      err.hint = unauthorizedHint;
    }
    throw err;
  }

  return { durationMs, status, body };
}

function createServerProcessManager(child, { source }) {
  const state = {
    child,
    pid: child.pid ?? null,
    source,
    startedByScript: source === 'spawned',
    exited: false,
    exitCode: null,
    signal: null,
    stopRequested: false,
  };
  state.exitPromise = new Promise((resolve) => {
    child.once('exit', (code, signal) => {
      state.exited = true;
      state.exitCode = code ?? null;
      state.signal = signal ?? null;
      resolve({ code, signal });
    });
  });
  child.once('error', (error) => {
    state.spawnError = error;
  });
  return state;
}

async function stopServerProcessTree(serverManager) {
  if (!serverManager?.startedByScript) return;
  if (serverManager.stopRequested) return;
  serverManager.stopRequested = true;

  const pid = serverManager.pid;
  console.log(`[ready-to-train] stopping temporary server pid=${pid ?? 'unknown'}`);

  try {
    if (!serverManager.exited && pid) {
      if (process.platform === 'win32') {
        const killRes = spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        if (killRes.status !== 0 && !serverManager.exited) {
          const stderr = String(killRes.stderr || '').trim();
          const stdout = String(killRes.stdout || '').trim();
          console.warn(
            `[ready-to-train] taskkill returned ${killRes.status} for pid=${pid}${stderr ? `: ${stderr}` : (stdout ? `: ${stdout}` : '')}`,
          );
        }
      } else {
        try {
          serverManager.child.kill('SIGTERM');
        } catch {
          // ignore
        }
      }
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`[ready-to-train] warning: failed to stop temporary server pid=${pid ?? 'unknown'}: ${reason}`);
  }

  await Promise.race([serverManager.exitPromise, sleep(5000)]);

  if (!serverManager.exited && process.platform !== 'win32') {
    try {
      serverManager.child.kill('SIGKILL');
      await Promise.race([serverManager.exitPromise, sleep(2000)]);
    } catch {
      // ignore
    }
  }

  if (serverManager.exited) {
    console.log(
      `[ready-to-train] temporary server stopped (code=${serverManager.exitCode ?? 'null'} signal=${serverManager.signal ?? 'null'})`,
    );
  } else {
    console.warn('[ready-to-train] temporary server stop timed out');
  }
}

async function waitForServerReady({
  baseUrl,
  headers,
  timeoutMs,
  pollMs = 500,
  serverManager,
}) {
  const readyUrl = new URL('/api/internal/health/db', baseUrl).toString();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (serverManager?.spawnError) {
      const err = new Error(`temporary server spawn failed: ${serverManager.spawnError.message}`);
      err.stepName = 'server_start';
      throw err;
    }
    if (serverManager?.exited) {
      const err = new Error(
        `temporary server exited before readiness (code=${serverManager.exitCode ?? 'null'} signal=${serverManager.signal ?? 'null'})`,
      );
      err.stepName = 'server_start';
      throw err;
    }

    const probe = await fetchJsonProbe(readyUrl, { headers, timeoutMs: Math.min(1500, timeoutMs) });
    if (probe.reachable) {
      console.log(
        `[ready-to-train] temporary server responded on health_db (status=${probe.status ?? 'n/a'}) after ${probe.durationMs}ms`,
      );
      return probe;
    }

    await sleep(pollMs);
  }

  const err = new Error(`temporary server did not become ready within ${timeoutMs}ms`);
  err.stepName = 'server_start';
  throw err;
}

async function ensureServerReady({
  npmCmd,
  baseUrl,
  port,
  startServer,
  startTimeoutMs,
  internalHeaders,
}) {
  const healthUrl = new URL('/api/internal/health/db', baseUrl).toString();
  const initialProbe = await fetchJsonProbe(healthUrl, { headers: internalHeaders, timeoutMs: 1500 });

  if (initialProbe.reachable) {
    console.log(
      `[ready-to-train] using existing server at ${baseUrl} (health_db probe status=${initialProbe.status ?? 'n/a'})`,
    );
    return {
      mode: 'existing',
      startedByScript: false,
      baseUrl,
      port,
      initialProbe,
      manager: null,
    };
  }

  if (!startServer) {
    const err = new Error(`server unreachable at ${baseUrl} and READY_START_SERVER=false`);
    err.stepName = 'server_start';
    throw err;
  }

  const args = ['run', 'dev', '--', '--port', String(port)];
  console.log(`[ready-to-train] starting temporary server: ${npmCmd} ${args.join(' ')}`);
  const child = spawn(npmCmd, args, {
    shell: process.platform === 'win32',
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(port),
    },
  });

  const manager = createServerProcessManager(child, { source: 'spawned' });
  try {
    await waitForServerReady({
      baseUrl,
      headers: internalHeaders,
      timeoutMs: startTimeoutMs,
      serverManager: manager,
    });
    return {
      mode: 'spawned',
      startedByScript: true,
      baseUrl,
      port,
      manager,
    };
  } catch (error) {
    await stopServerProcessTree(manager);
    throw error;
  }
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
  const appBaseUrl = args.baseUrl ?? process.env.READY_SERVER_URL ?? process.env.INTERNAL_EXPORT_BASE_URL ?? 'http://localhost:3000';
  const parsedBaseUrl = new URL(appBaseUrl);
  const readyServerPort = safeInt(
    args.serverPort ?? process.env.READY_SERVER_PORT ?? (parsedBaseUrl.port || undefined),
    3000,
  );
  const readyStartServer = parseBool(args.startServer ?? process.env.READY_START_SERVER, true);
  const readyServerStartTimeoutMs = safeInt(
    args.serverStartTimeoutMs ?? process.env.READY_SERVER_START_TIMEOUT_MS,
    20000,
  );
  const internalToken =
    String(args.internalToken ?? process.env.READY_INTERNAL_TOKEN ?? '').trim() ||
    String(process.env.INTERNAL_EXPORT_TOKEN ?? '').trim();
  const internalHeaders = buildInternalHeaders(internalToken);
  const unauthorizedHint = 'Set READY_INTERNAL_TOKEN (or INTERNAL_EXPORT_TOKEN) if internal endpoints require auth';
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

  let serverState = null;
  try {
    report.steps.push({ step: 'typecheck', ...(runCommand('typecheck', npmCmd, ['run', 'typecheck'])) });
    const preBuildServerProbe = await fetchJsonProbe(new URL('/api/internal/health/db', appBaseUrl).toString(), {
      headers: internalHeaders,
      timeoutMs: 1500,
    });
    if (preBuildServerProbe.reachable) {
      console.log(
        `[ready-to-train] pre-build probe found existing server at ${appBaseUrl} (status=${preBuildServerProbe.status ?? 'n/a'})`,
      );
    }
    report.steps.push({
      step: 'build',
      ...(await runBuildStep(npmCmd, {
        distDirBase: `.next-ready-${timestamp}`,
        skipWindowsProcessKill: preBuildServerProbe.reachable,
      })),
    });

    if (!internalToken) {
      console.warn('[ready-to-train] no READY_INTERNAL_TOKEN/INTERNAL_EXPORT_TOKEN provided; trying internal endpoints without x-internal-token (dev bypass)');
    }

    serverState = await ensureServerReady({
      npmCmd,
      baseUrl: appBaseUrl,
      port: readyServerPort,
      startServer: readyStartServer,
      startTimeoutMs: readyServerStartTimeoutMs,
      internalHeaders,
    });
    report.steps.push({
      step: 'server',
      mode: serverState.mode,
      baseUrl: appBaseUrl,
      port: readyServerPort,
      startedByScript: serverState.startedByScript,
    });

    report.steps.push({
      step: 'health_db',
      ...(await httpJsonCheck('health_db', new URL('/api/internal/health/db', appBaseUrl).toString(), {
        headers: internalHeaders,
        unauthorizedHint: !internalToken ? unauthorizedHint : undefined,
      })),
    });
    report.steps.push({
      step: 'health_ai',
      ...(await httpJsonCheck('health_ai', new URL('/api/internal/health/ai', appBaseUrl).toString(), {
        headers: internalHeaders,
        unauthorizedHint: !internalToken ? unauthorizedHint : undefined,
      })),
    });
    report.steps.push({
      step: 'health_qdrant',
      ...(await httpJsonCheck('health_qdrant', new URL('/api/internal/health/qdrant', appBaseUrl).toString(), {
        headers: internalHeaders,
        unauthorizedHint: !internalToken ? unauthorizedHint : undefined,
      })),
    });

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
          shell: false,
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
        { shell: false },
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
        { shell: false },
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
      hint: error?.hint ?? null,
    };
    console.error('READY_TO_TRAIN_FAIL', JSON.stringify(report, null, 2));
  } finally {
    await stopServerProcessTree(serverState?.manager ?? null);
  }

  if (report.status === 'FAIL') {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('READY_TO_TRAIN_FATAL', error);
  process.exit(1);
});
