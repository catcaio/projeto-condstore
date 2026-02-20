import 'dotenv/config';
import { getDb } from '../src/infra/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function main() {
    const db = await getDb();
    const migrationPath = path.join(process.cwd(), 'drizzle', '0004_legal_iron_man.sql');
    const content = fs.readFileSync(migrationPath, 'utf-8');

    // Split by statement-breakpoint as used by Drizzle
    const statements = content.split('--> statement-breakpoint')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    console.log(`Found ${statements.length} statements to execute.`);

    for (const statement of statements) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        try {
            await db.execute(sql.raw(statement));
            console.log('  -> Success');
        } catch (error) {
            const msg = (error as Error).message;
            if (msg.includes('already exists') || msg.includes('Unknown table')) {
                console.warn(`  -> Skipped (likely already applied): ${msg}`);
            } else {
                console.error(`  -> FAILED: ${msg}`);
                throw error;
            }
        }
    }

    console.log('Migration completed manually.');
    process.exit(0);
}

main().catch(console.error);
