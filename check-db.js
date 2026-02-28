const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });
async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('No DB URL');
  const conn = await mysql.createConnection(url);
  const [rows] = await conn.query('SHOW TABLES');
  console.log('Tables:', rows);
  conn.destroy();
}
run().catch(console.error);
