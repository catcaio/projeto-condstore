#!/usr/bin/env node

const DEFAULT_BASE_URL = "http://localhost:3000";
const EVENTS_BODY_MAX_BYTES = 8 * 1024;

function normalizeBaseUrl(value) {
  return String(value || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
}

function maskValue(value, visible = 6) {
  if (!value) return "(empty)";
  const str = String(value);
  const prefix = str.slice(0, Math.min(visible, str.length));
  return `${prefix}... (len=${str.length})`;
}

function maskCookieHeader(cookieHeader) {
  if (!cookieHeader) return "(empty)";
  return String(cookieHeader)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const idx = part.indexOf("=");
      if (idx < 0) return part;
      const name = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      return `${name}=${maskValue(value, 8)}`;
    })
    .join("; ");
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function truncate(value, max = 240) {
  const str = String(value ?? "");
  if (str.length <= max) return str;
  return `${str.slice(0, max)}...`;
}

function mergeCookieHeaders(...cookieHeaders) {
  const map = new Map();

  for (const header of cookieHeaders) {
    if (!header) continue;
    for (const pair of String(header).split(";")) {
      const trimmed = pair.trim();
      if (!trimmed) continue;
      const idx = trimmed.indexOf("=");
      if (idx <= 0) continue;
      const name = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      if (!name) continue;
      map.set(name, value);
    }
  }

  return Array.from(map.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function getRequestId(response) {
  return response.headers.get("x-request-id");
}

function getSetCookieStrings(response) {
  const headers = response.headers;
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

function extractCookieValueFromSetCookie(setCookieHeaders, cookieName) {
  const pattern = new RegExp(`${cookieName}=([^;,\r\n]+)`);
  for (const raw of setCookieHeaders) {
    const match = pattern.exec(raw);
    if (match?.[1]) return match[1];
  }
  return null;
}

async function parseJsonBody(response) {
  const text = await response.text();
  try {
    return {
      text,
      json: text ? JSON.parse(text) : null,
    };
  } catch {
    return {
      text,
      json: null,
    };
  }
}

function shapeSummaryBuckets(data) {
  if (!Array.isArray(data?.buckets)) return { ok: false, note: "buckets is not an array" };
  if (data.buckets.length === 0) return { ok: true, note: "buckets=[] (no data yet)" };

  const invalid = data.buckets.find((bucket) => typeof bucket?.key !== "string");
  if (invalid) return { ok: false, note: "bucket without string key" };

  const keys = data.buckets.map((bucket) => bucket.key);
  const hasSmoke = keys.includes("smoke");
  const hasNone = keys.includes("(none)");
  if (hasSmoke || hasNone) {
    return { ok: true, note: `bucket keys include ${hasSmoke ? "smoke" : "(none)"}` };
  }
  return { ok: true, note: "shape ok; smoke bucket not visible yet" };
}

function printStep(status, name, detail) {
  const marker = status === "OK" ? "OK" : "FAIL";
  console.log(`[${marker}] ${name}${detail ? ` - ${detail}` : ""}`);
}

async function run() {
  if (typeof fetch !== "function") {
    throw new Error("Global fetch is not available. Use Node 18+.");
  }

  const baseUrl = normalizeBaseUrl(process.env.BASE_URL);
  const internalToken = requireEnv("INTERNAL_TOKEN");
  const cockpitCookie = requireEnv("COCKPIT_COOKIE");
  const tenantId = requireEnv("TENANT_ID");

  const results = [];
  const startedAt = Date.now();
  const state = {
    trackingToken: null,
    attrCookieValue: null,
  };

  console.log("[smoke] Starting HTTP smoke test");
  console.log(`[smoke] BASE_URL=${baseUrl}`);
  console.log(`[smoke] INTERNAL_TOKEN=${maskValue(internalToken)}`);
  console.log(`[smoke] COCKPIT_COOKIE=${maskCookieHeader(cockpitCookie)}`);
  console.log(`[smoke] TENANT_ID=${tenantId}`);

  const steps = [
    {
      name: "diag",
      run: async () => {
        const res = await fetch(`${baseUrl}/api/internal/diag`, {
          method: "GET",
          headers: {
            "x-internal-token": internalToken,
          },
        });
        const requestId = getRequestId(res);
        const { json, text } = await parseJsonBody(res);

        assert(res.status === 200, `expected 200, got ${res.status} body=${truncate(text)}`);
        assert(requestId, "missing x-request-id");

        return `status=200 requestId=${requestId} db=${json?.db ?? "?"} redis=${json?.redis ?? "?"}`;
      },
    },
    {
      name: "attribution_tokens",
      run: async () => {
        const payload = {
          count: 1,
          tenantId,
          campaign: "smoke",
          source: "google",
          medium: "cpc",
        };

        const res = await fetch(`${baseUrl}/api/cockpit/attribution/tokens`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Cookie: cockpitCookie,
          },
          body: JSON.stringify(payload),
        });
        const { json, text } = await parseJsonBody(res);

        assert(res.status === 200, `expected 200, got ${res.status} body=${truncate(text)}`);
        const token = json?.tokens?.[0]?.token;
        const finalUrlTemplate =
          json?.final_url_template ??
          json?.final_url ??
          json?.tokens?.[0]?.finalUrl ??
          json?.tokens?.[0]?.final_url;

        assert(typeof token === "string" && token.length >= 6, "missing token in response");
        assert(typeof finalUrlTemplate === "string", "missing final_url_template/final_url in response");

        state.trackingToken = token;
        return `token=${maskValue(token)} final=${truncate(finalUrlTemplate, 120)}`;
      },
    },
    {
      name: "tracking_redirect",
      run: async () => {
        assert(state.trackingToken, "tracking token not set");

        const params = new URLSearchParams({
          utm_source: "google",
          utm_medium: "cpc",
          utm_campaign: "smoke",
          utm_content: "smoke",
          utm_term: "smoke",
        });

        const res = await fetch(`${baseUrl}/t/${encodeURIComponent(state.trackingToken)}?${params.toString()}`, {
          method: "GET",
          redirect: "manual",
        });

        const setCookieHeaders = getSetCookieStrings(res);
        const attrCookieValue = extractCookieValueFromSetCookie(setCookieHeaders, "condstore_attr");
        const location = res.headers.get("location");

        assert(res.status === 302, `expected 302, got ${res.status}`);
        assert(location, "missing Location header");
        assert(attrCookieValue, "missing condstore_attr in Set-Cookie");

        state.attrCookieValue = attrCookieValue;
        return `302 -> ${truncate(location, 120)} condstore_attr=${maskValue(attrCookieValue)}`;
      },
    },
    {
      name: "events_ingest",
      run: async () => {
        assert(state.attrCookieValue, "attr cookie not set");

        const eventPayload = {
          event: "funnel_smoke",
          path: "/smoke/http",
          props: {
            utm_source: "google",
            utm_medium: "cpc",
            utm_campaign: "smoke",
            utm_content: "smoke",
            utm_term: "smoke",
            smoke: true,
            smoke_run_at: new Date().toISOString(),
          },
        };

        const body = JSON.stringify(eventPayload);
        const bodyBytes = Buffer.byteLength(body);
        assert(bodyBytes <= EVENTS_BODY_MAX_BYTES, `events body too large (${bodyBytes} bytes)`);

        const cookieHeader = mergeCookieHeaders(cockpitCookie, `condstore_attr=${state.attrCookieValue}`);
        const res = await fetch(`${baseUrl}/api/events`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Cookie: cookieHeader,
          },
          body,
        });

        const requestId = getRequestId(res);
        const { json, text } = await parseJsonBody(res);

        assert(res.status === 200, `expected 200, got ${res.status} body=${truncate(text)}`);
        assert(requestId, "missing x-request-id");
        assert(json?.ok === true, "expected { ok: true }");

        return `status=200 requestId=${requestId} cookie=${maskCookieHeader(cookieHeader)}`;
      },
    },
    {
      name: "acquisition_metrics",
      run: async () => {
        const res = await fetch(`${baseUrl}/api/cockpit/metrics/acquisition?window=7d&groupBy=utm_campaign`, {
          method: "GET",
          headers: {
            Cookie: cockpitCookie,
          },
        });

        const { json, text } = await parseJsonBody(res);
        const tzHeader = res.headers.get("x-metrics-timezone");
        const shapeCheck = shapeSummaryBuckets(json);

        assert(res.status === 200, `expected 200, got ${res.status} body=${truncate(text)}`);
        assert(tzHeader, "missing X-Metrics-Timezone header");
        assert(shapeCheck.ok, shapeCheck.note);
        assert(json && typeof json === "object", "invalid JSON shape");
        assert(Array.isArray(json.buckets), "buckets missing");

        return `tz=${tzHeader} source=${json?.source ?? "?"} buckets=${json.buckets.length} (${shapeCheck.note})`;
      },
    },
    {
      name: "ops_status",
      run: async () => {
        const res = await fetch(`${baseUrl}/api/cockpit/ops/status`, {
          method: "GET",
          headers: {
            Cookie: cockpitCookie,
          },
        });

        const { json, text } = await parseJsonBody(res);
        assert(res.status === 200, `expected 200, got ${res.status} body=${truncate(text)}`);
        assert(typeof json?.db_ok === "boolean", "missing/invalid db_ok");
        assert(typeof json?.redis_ok === "boolean", "missing/invalid redis_ok");

        return `db_ok=${json.db_ok} redis_ok=${json.redis_ok} tz=${json?.timezone ?? "?"}`;
      },
    },
  ];

  let failed = false;

  for (const step of steps) {
    try {
      const detail = await step.run();
      results.push({ name: step.name, status: "OK", detail });
      printStep("OK", step.name, detail);
    } catch (error) {
      const detail = (error instanceof Error ? error.message : String(error));
      results.push({ name: step.name, status: "FAIL", detail });
      printStep("FAIL", step.name, detail);
      failed = true;
      break;
    }
  }

  console.log("");
  console.log("[smoke] Summary");
  for (const result of results) {
    printStep(result.status, result.name, result.detail);
  }
  console.log(`[smoke] Duration: ${Date.now() - startedAt}ms`);

  if (failed) {
    process.exitCode = 1;
    return;
  }

  console.log("[smoke] HTTP smoke test completed successfully");
  process.exitCode = 0;
}

run().catch((error) => {
  console.error(`[smoke] Fatal: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
