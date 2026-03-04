import * as dotenv from 'dotenv';
import path from 'path';
import { execSync } from 'child_process';

// Load from .env.production if it exists, otherwise rely on system envs (for CI)
dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log('--- Starting Production Migrations ---');
    const dbUrl = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('❌ DATABASE_URL or PROD_DATABASE_URL not found in environment.');
        process.exit(1);
    }

    // Set DATABASE_URL for the underlying script
    process.env.DATABASE_URL = dbUrl;

    console.log(`Connecting to: ${dbUrl.split('@')[1] || 'URL hidden'}...`);

    try {
        console.log('Running robust SQL migration executor...');
        execSync('node scripts/run-sql-migrations.mjs', { stdio: 'inherit' });
        console.log('✅ Migrations applied successfully.');
    } catch (e: any) {
        console.error('❌ Migration failed:', e);
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('❌ Unhandled error:', err);
    process.exit(1);
});
