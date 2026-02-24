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

function parseBool(value, defaultValue) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return defaultValue;
}

const args = parseArgs(process.argv.slice(2));
const sinceHours = Math.max(1, Number.parseInt(args.sinceHours ?? '24', 10) || 24);
const dryRun = parseBool(args.dryRun, true);

const baseUrl = process.env.INTERNAL_EXPORT_BASE_URL ?? 'http://127.0.0.1:3000';
const internalToken = String(process.env.INTERNAL_EXPORT_TOKEN ?? '').trim();
if (!internalToken) {
  console.error('INTERNAL_EXPORT_TOKEN is required');
  process.exit(1);
}

const url = new URL('/api/internal/frank/scheduler/run', baseUrl);
const res = await fetch(url, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-internal-token': internalToken,
  },
  body: JSON.stringify({ sinceHours, dryRun }),
});

let body = null;
try {
  body = await res.json();
} catch {
  body = null;
}

console.log(
  'FRANK_SCHEDULER_RESULT',
  JSON.stringify(
    {
      ok: res.ok && body?.ok === true,
      status: res.status,
      response: body,
    },
    null,
    2,
  ),
);

if (!res.ok || body?.ok !== true) {
  process.exit(1);
}

