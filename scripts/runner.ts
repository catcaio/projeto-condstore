import { migrate } from 'drizzle-orm/mysql2/migrator';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  console.log('Connecting to TiDB...');
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection);
  
  console.log('Running migrator...');
  await migrate(db, { migrationsFolder: './drizzle' });
  
  console.log('Done.');
  await connection.end();
}
main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
