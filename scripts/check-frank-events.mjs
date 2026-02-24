import mysql from 'mysql2/promise';

const tenantId = process.argv[2] ?? 'lojacond-default';
const url = process.env.DATABASE_URL;

if (!url) {
  console.error('DATABASE_URL não definida.');
  process.exit(1);
}

const conn = await mysql.createConnection({
  uri: url,
  ssl: { rejectUnauthorized: false },
});

try {
  const [countRows] = await conn.execute(
    'SELECT COUNT(*) AS total FROM `frank_events` WHERE `tenant_id` = ?',
    [tenantId],
  );

  const [lastRows] = await conn.execute(
    `
      SELECT
        id,
        tenant_id,
        session_id,
        correlation_id,
        kind,
        provider,
        model,
        latency_ms,
        tokens_prompt,
        tokens_completion,
        created_at,
        payload_json
      FROM \`frank_events\`
      WHERE \`tenant_id\` = ?
      ORDER BY \`created_at\` DESC
      LIMIT 1
    `,
    [tenantId],
  );

  console.log('TENANT', tenantId);
  console.log('COUNT', Number(countRows[0]?.total ?? 0));

  const latest = lastRows[0] ?? null;
  console.log('LATEST', JSON.stringify(latest, null, 2));

  const payload = latest?.payload_json ?? null;
  const payloadStr = JSON.stringify(payload ?? {});
  const payloadBytes = Buffer.byteLength(payloadStr, 'utf8');
  const checks = {
    contains_http: /http/i.test(payloadStr),
    contains_mysql_url: /mysql:\/\//i.test(payloadStr),
    contains_sk: /sk-/i.test(payloadStr),
    contains_bearer: /Bearer/i.test(payloadStr),
    contains_email_marker: /@/.test(payloadStr),
    contains_br_phone: /\+55/.test(payloadStr),
    payload_lt_10kb: payloadBytes < 10 * 1024,
  };

  console.log('PAYLOAD_BYTES', payloadBytes);
  console.log('PAYLOAD_CHECKS', JSON.stringify(checks, null, 2));

  const hasForbidden =
    checks.contains_http ||
    checks.contains_mysql_url ||
    checks.contains_sk ||
    checks.contains_bearer ||
    checks.contains_email_marker ||
    checks.contains_br_phone;

  if (hasForbidden || !checks.payload_lt_10kb) {
    console.error('PAYLOAD_VALIDATION_FAILED');
    process.exitCode = 2;
  }
} finally {
  await conn.end();
}
