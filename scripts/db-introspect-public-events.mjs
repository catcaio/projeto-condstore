/**
 * db-introspect-public-events.mjs
 * Verifica se a tabela public_events existe no TiDB e lista suas colunas/DDL.
 * Uso: node --env-file=.env scripts/db-introspect-public-events.mjs
 */
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL não definida.');
  process.exit(1);
}

console.log('=== CONECTANDO AO TIDB ===');
const conn = await mysql.createConnection({
  uri: url,
  ssl: { rejectUnauthorized: false },
});

console.log('\n=== SHOW TABLES LIKE public_events ===');
const [tables] = await conn.query("SHOW TABLES LIKE 'public_events'");
console.log(tables);

if (tables.length === 0) {
  console.log('\n⚠️  TABELA NÃO EXISTE — migration pendente.');
} else {
  console.log('\n✅ TABELA EXISTE');

  console.log('\n=== SHOW COLUMNS FROM public_events ===');
  const [cols] = await conn.query('SHOW COLUMNS FROM public_events');
  console.table(cols.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null, Key: c.Key, Default: c.Default })));

  console.log('\n=== SHOW CREATE TABLE public_events ===');
  const [ddl] = await conn.query('SHOW CREATE TABLE public_events');
  console.log(ddl[0]['Create Table']);

  console.log('\n=== SHOW INDEX FROM public_events ===');
  const [indexes] = await conn.query('SHOW INDEX FROM public_events');
  console.table(indexes.map(i => ({ Key_name: i.Key_name, Seq: i.Seq_in_index, Column: i.Column_name })));
}

await conn.end();
process.exit(0);
