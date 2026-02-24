import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const journalPath = path.join(repoRoot, 'drizzle', 'meta', '_journal.json');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL não definida.');
  process.exit(1);
}

if (!fs.existsSync(journalPath)) {
  console.error(`Journal não encontrado: ${journalPath}`);
  process.exit(1);
}

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function loadJournalEntries() {
  const raw = fs.readFileSync(journalPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed?.entries)) {
    throw new Error('Formato inválido de drizzle/meta/_journal.json (entries ausente)');
  }
  return parsed.entries;
}

function resolveMigrationSqlPath(tag) {
  return path.join(repoRoot, 'drizzle', `${tag}.sql`);
}

const conn = await mysql.createConnection({
  uri: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  console.log('=== drizzle baseline ===');
  console.log(`journal: ${path.relative(repoRoot, journalPath)}`);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS \`__drizzle_migrations\` (
      \`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
      \`hash\` text NOT NULL,
      \`created_at\` bigint DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`id\` (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
  `);
  console.log('OK table __drizzle_migrations exists');

  const entries = loadJournalEntries();
  console.log(`journal entries: ${entries.length}`);

  const [existingRows] = await conn.query('SELECT hash FROM `__drizzle_migrations`');
  const existingHashes = new Set(existingRows.map((row) => String(row.hash)));

  let inserted = 0;
  let skipped = 0;

  for (const entry of entries) {
    const tag = entry?.tag;
    if (!tag || typeof tag !== 'string') {
      throw new Error(`Entrada inválida no journal: ${JSON.stringify(entry)}`);
    }

    const sqlPath = resolveMigrationSqlPath(tag);
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Arquivo de migration não encontrado para tag ${tag}: ${path.relative(repoRoot, sqlPath)}`);
    }

    const hash = sha256File(sqlPath);
    if (existingHashes.has(hash)) {
      skipped += 1;
      console.log(`SKIP ${tag} (hash exists)`);
      continue;
    }

    const createdAt = Date.now();
    const [result] = await conn.execute(
      `
        INSERT INTO \`__drizzle_migrations\` (\`hash\`, \`created_at\`)
        SELECT ?, ?
        WHERE NOT EXISTS (
          SELECT 1 FROM \`__drizzle_migrations\` WHERE \`hash\` = ? LIMIT 1
        )
      `,
      [hash, createdAt, hash],
    );

    if (result.affectedRows > 0) {
      existingHashes.add(hash);
      inserted += 1;
      console.log(`INSERT ${tag} -> ${hash.slice(0, 12)}...`);
    } else {
      skipped += 1;
      existingHashes.add(hash);
      console.log(`SKIP ${tag} (race/exists)`);
    }
  }

  const [countRows] = await conn.query('SELECT COUNT(*) AS total FROM `__drizzle_migrations`');
  console.log(`SUMMARY inserted=${inserted} skipped=${skipped} total=${countRows[0].total}`);

  const [lastRows] = await conn.query(
    'SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY created_at DESC, id DESC LIMIT 5'
  );
  console.log('LATEST', JSON.stringify(lastRows, null, 2));
} finally {
  await conn.end();
}

