/**
 * migrate-encrypt-apikeys.mjs
 *
 * Migração idempotente: plaintext api_key → AES-256-GCM api_key_encrypted
 *
 * Critérios de skip (por row):
 *   - api_key IS NULL → já limpa, nada a fazer
 *   - api_key_encrypted LIKE 'v1:%' → já migrado
 *
 * Após migrar: seta api_key = NULL (remove plaintext do banco)
 *
 * Uso: node --env-file=.env --env-file=.env.local scripts/migrate-encrypt-apikeys.mjs
 */
import mysql from 'mysql2/promise';
import { createCipheriv, randomBytes } from 'node:crypto';

const DB_URL   = process.env.DATABASE_URL;
const KEY_HEX  = process.env.PROVIDER_SECRETS_KEY;

if (!DB_URL)  { console.error('❌  DATABASE_URL não definida'); process.exit(1); }
if (!KEY_HEX) { console.error('❌  PROVIDER_SECRETS_KEY não definida'); process.exit(1); }
if (KEY_HEX.length !== 64) {
  console.error(`❌  PROVIDER_SECRETS_KEY deve ter 64 chars hex. Atual: ${KEY_HEX.length}`);
  process.exit(1);
}

const keyBuf = Buffer.from(KEY_HEX, 'hex');

function encrypt(plain) {
  const iv  = randomBytes(12);
  const cip = createCipheriv('aes-256-gcm', keyBuf, iv);
  const ct  = Buffer.concat([cip.update(plain, 'utf8'), cip.final()]);
  const tag = cip.getAuthTag();
  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${ct.toString('hex')}`;
}

console.log('=== Conectando ao TiDB ===');
const conn = await mysql.createConnection({ uri: DB_URL, ssl: { rejectUnauthorized: false } });

// Busca rows que precisam de migração
const [rows] = await conn.query(
  `SELECT id, tenant_id, api_key, api_key_encrypted
   FROM tenant_ai_providers
   WHERE api_key IS NOT NULL`
);

console.log(`Rows com api_key preenchida: ${rows.length}`);

let migrated = 0;
let skipped  = 0;

for (const row of rows) {
  const alreadyEncrypted = typeof row.api_key_encrypted === 'string' &&
                           row.api_key_encrypted.startsWith('v1:');

  if (alreadyEncrypted) {
    console.log(`  SKIP [${row.tenant_id}] — api_key_encrypted já está no formato v1:`);
    // Ainda limpa o plaintext se estiver presente
    if (row.api_key) {
      await conn.execute(
        'UPDATE tenant_ai_providers SET api_key = NULL WHERE id = ?',
        [row.id]
      );
      console.log(`    → api_key (plaintext) removido.`);
    }
    skipped++;
    continue;
  }

  const cipher = encrypt(row.api_key);
  await conn.execute(
    'UPDATE tenant_ai_providers SET api_key = NULL, api_key_encrypted = ? WHERE id = ?',
    [cipher, row.id]
  );
  console.log(`  ✅ [${row.tenant_id}] migrado → ${cipher.slice(0, 20)}...`);
  migrated++;
}

// Verifica rows sem api_key mas também sem api_key_encrypted (sem chave configurada)
const [noKey] = await conn.query(
  `SELECT COUNT(*) AS cnt FROM tenant_ai_providers
   WHERE api_key IS NULL AND (api_key_encrypted IS NULL OR api_key_encrypted = '')`
);
console.log(`\nRows sem nenhuma api_key configurada: ${noKey[0].cnt} (normal para LM Studio local)`);

await conn.end();
console.log(`\n=== Migração concluída: ${migrated} migrados, ${skipped} pulados ===`);
process.exit(0);
