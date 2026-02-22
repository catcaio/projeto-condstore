import { getDb } from './src/infra/db';

async function main() {
    try {
        const db = await getDb();
        console.log('Got DB connection...');
        await (db as any).execute('ALTER TABLE users ADD session_version int DEFAULT 1 NOT NULL');
        console.log('Migration OK');
    } catch (err: any) {
        if (err.message?.includes('Duplicate column name')) {
            console.log('Already added.');
        } else {
            console.error('Migration failed:', err.message);
        }
    }
    process.exit(0);
}

main();
