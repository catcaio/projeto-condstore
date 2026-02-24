/**
 * apply-migration-0012.mjs
 * Aplica a migration 0012 (public_events) diretamente via mysql2.
 * Idempotente: CREATE TABLE IF NOT EXISTS + índices com ER_DUP_KEYNAME check.
 * Uso: node --env-file=.env scripts/apply-migration-0012.mjs
 */
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL não definida.');
  process.exit(1);
}

console.log('=== Conectando ao TiDB ===');
const conn = await mysql.createConnection({
  uri: url,
  ssl: { rejectUnauthorized: false },
});
console.log('Conexão estabelecida.');

// 1. CREATE TABLE IF NOT EXISTS
console.log('\n[1/3] CREATE TABLE IF NOT EXISTS public_events ...');
await conn.execute(`
  CREATE TABLE IF NOT EXISTS \`public_events\` (
    \`id\`          varchar(36)   NOT NULL,
    \`anon_id\`     varchar(128)  NOT NULL,
    \`event\`       varchar(64)   NOT NULL,
    \`path\`        varchar(200)  NOT NULL,
    \`props\`       text,
    \`user_agent\`  text,
    \`created_at\`  timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \`public_events_id\` PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`);
console.log('✅ Tabela criada ou já existia.');

// 2. Index event_time
console.log('\n[2/3] CREATE INDEX idx_public_events_event_time ...');
try {
  await conn.execute(
    'CREATE INDEX `idx_public_events_event_time` ON `public_events` (`event`, `created_at`)'
  );
  console.log('✅ Index event_time criado.');
} catch (e) {
  if (e.code === 'ER_DUP_KEYNAME') {
    console.log('⏩ SKIP: index event_time já existe.');
  } else {
    throw e;
  }
}

// 3. Index anon_time
console.log('\n[3/3] CREATE INDEX idx_public_events_anon_time ...');
try {
  await conn.execute(
    'CREATE INDEX `idx_public_events_anon_time` ON `public_events` (`anon_id`, `created_at`)'
  );
  console.log('✅ Index anon_time criado.');
} catch (e) {
  if (e.code === 'ER_DUP_KEYNAME') {
    console.log('⏩ SKIP: index anon_time já existe.');
  } else {
    throw e;
  }
}

await conn.end();
console.log('\n=== Migration 0012 aplicada com sucesso ===');
process.exit(0);
