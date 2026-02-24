import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const name = key.slice(2);
    const value = argv[i + 1];
    if (value && !value.startsWith('--')) {
      out[name] = value;
      i += 1;
    } else {
      out[name] = 'true';
    }
  }
  return out;
}

function normalizeText(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
}

function makeEval(expected, actual) {
  const exp = normalizeText(expected);
  const got = normalizeText(actual);
  if (!exp || !got) {
    return { exactOk: false, containsOk: false };
  }

  const expLc = exp.toLowerCase();
  const gotLc = got.toLowerCase();
  return {
    exactOk: exp === got,
    containsOk: gotLc.includes(expLc) || expLc.includes(gotLc),
  };
}

async function callLmStudio({ baseUrl, model, systemText, userText }) {
  const url = new URL(baseUrl);
  url.pathname = `${url.pathname.replace(/\/$/, '')}/chat/completions`;
  const messages = [];
  if (systemText) messages.push({ role: 'system', content: systemText });
  messages.push({ role: 'user', content: userText });

  const startedAt = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0,
    }),
  });
  const latencyMs = Date.now() - startedAt;

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw Object.assign(new Error(`HTTP ${res.status}: ${body.slice(0, 400)}`), { latencyMs, status: res.status });
  }

  const json = await res.json();
  const assistant =
    json?.choices?.[0]?.message?.content ??
    json?.choices?.[0]?.text ??
    '';

  return {
    assistant: typeof assistant === 'string' ? assistant : JSON.stringify(assistant),
    usage: json?.usage ?? {},
    latencyMs,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inFile = args.in;
  const outFile = args.out;
  const baseUrl = args.baseUrl ?? 'http://127.0.0.1:1234/v1';
  const model = args.model ?? 'qwen2.5-7b-instruct-1m';
  const limit = Math.max(1, Number.parseInt(args.limit ?? '200', 10) || 200);
  const concurrency = Math.max(1, Number.parseInt(args.concurrency ?? '2', 10) || 2);

  if (!inFile || !outFile) {
    console.error('Uso: node scripts/replay-frank.mjs --in dataset.jsonl --out replay.jsonl [--baseUrl ...] [--model ...] [--limit 200] [--concurrency 2]');
    process.exit(1);
  }

  const inputPath = inFile;
  const outputPath = outFile;

  const startedAt = Date.now();
  let seen = 0;
  let queued = 0;
  let written = 0;
  let skipped = 0;

  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true }).catch(() => {});
  const out = fs.createWriteStream(outputPath, { flags: 'w' });

  const rl = readline.createInterface({
    input: fs.createReadStream(inputPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  const pool = new Set();

  const enqueue = async (line, lineNo) => {
    const task = (async () => {
      let row;
      try {
        row = JSON.parse(line);
      } catch (error) {
        skipped += 1;
        const replayRow = {
          status: 'error',
          error: `invalid_json_line:${lineNo}`,
          lineNo,
        };
        out.write(`${JSON.stringify(replayRow)}\n`);
        written += 1;
        return;
      }

      const payload = row?.payload_json ?? {};
      const systemText = typeof payload.systemText === 'string' ? payload.systemText : undefined;
      const userText = typeof payload.userText === 'string' ? payload.userText : undefined;
      const expectedAssistant = typeof payload.assistantText === 'string' ? payload.assistantText : undefined;

      if (!userText) {
        skipped += 1;
        const replayRow = {
          tenantId: row?.tenant_id ?? null,
          correlationId: row?.correlation_id ?? null,
          createdAt: row?.created_at ?? null,
          model,
          provider: 'lmstudio',
          status: 'skipped',
          reason: 'missing_userText',
        };
        out.write(`${JSON.stringify(replayRow)}\n`);
        written += 1;
        return;
      }

      try {
        const result = await callLmStudio({ baseUrl, model, systemText, userText });
        const evalResult = makeEval(expectedAssistant, result.assistant);

        const replayRow = {
          tenantId: row?.tenant_id ?? null,
          sessionId: row?.session_id ?? null,
          correlationId: row?.correlation_id ?? null,
          createdAt: row?.created_at ?? null,
          provider: 'lmstudio',
          model,
          input: {
            ...(systemText ? { system: systemText } : {}),
            user: userText,
          },
          expected: expectedAssistant ? { assistant: expectedAssistant } : undefined,
          output: {
            assistant: result.assistant,
          },
          eval: evalResult,
          metrics: {
            status: 'ok',
            latency_ms: result.latencyMs,
            tokens_prompt: typeof result.usage?.prompt_tokens === 'number' ? result.usage.prompt_tokens : null,
            tokens_completion: typeof result.usage?.completion_tokens === 'number' ? result.usage.completion_tokens : null,
            tokens_total: typeof result.usage?.total_tokens === 'number' ? result.usage.total_tokens : null,
          },
          latencyMs: result.latencyMs,
        };

        out.write(`${JSON.stringify(replayRow)}\n`);
        written += 1;
      } catch (error) {
        const replayRow = {
          tenantId: row?.tenant_id ?? null,
          sessionId: row?.session_id ?? null,
          correlationId: row?.correlation_id ?? null,
          createdAt: row?.created_at ?? null,
          provider: 'lmstudio',
          model,
          input: {
            ...(systemText ? { system: systemText } : {}),
            ...(userText ? { user: userText } : {}),
          },
          expected: expectedAssistant ? { assistant: expectedAssistant } : undefined,
          output: {
            assistant: null,
          },
          eval: { exactOk: false, containsOk: false },
          metrics: {
            status: 'error',
            latency_ms: typeof error?.latencyMs === 'number' ? error.latencyMs : null,
            tokens_prompt: null,
            tokens_completion: null,
            tokens_total: null,
            error: String(error?.message ?? error),
          },
          latencyMs: typeof error?.latencyMs === 'number' ? error.latencyMs : null,
        };
        out.write(`${JSON.stringify(replayRow)}\n`);
        written += 1;
      }
    })()
      .finally(() => {
        pool.delete(task);
      });

    pool.add(task);
    if (pool.size >= concurrency) {
      await Promise.race(pool);
    }
  };

  let lineNo = 0;
  for await (const line of rl) {
    lineNo += 1;
    if (!line || !line.trim()) continue;
    seen += 1;
    if (queued >= limit) break;
    queued += 1;
    await enqueue(line, lineNo);
  }

  await Promise.all(pool);

  await new Promise((resolve, reject) => {
    out.end((err) => (err ? reject(err) : resolve()));
  });

  const stat = await fs.promises.stat(outputPath);
  const durationMs = Date.now() - startedAt;
  console.log('REPLAY_OK', JSON.stringify({
    inFile: inputPath,
    outFile: outputPath,
    seen,
    queued,
    written,
    skipped,
    limit,
    concurrency,
    bytes: stat.size,
    durationMs,
  }, null, 2));
}

main().catch((error) => {
  console.error('REPLAY_FATAL', error);
  process.exit(1);
});
