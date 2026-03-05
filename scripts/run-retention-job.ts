/**
 * LGPD Data Retention Runner
 *
 * Standalone script to trigger the data retention purge job
 * via the internal API endpoint.
 *
 * Usage:
 *   INTERNAL_TOKEN=<token> APP_URL=<url> node --import tsx scripts/run-retention-job.ts
 *
 * Environment Variables:
 *   INTERNAL_TOKEN  - Required. The internal token for authentication.
 *   APP_URL         - Optional. Defaults to http://localhost:3000.
 */

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN;

async function main() {
    if (!INTERNAL_TOKEN) {
        console.error('❌ INTERNAL_TOKEN is required. Set it in your environment.');
        process.exit(1);
    }

    const url = `${APP_URL}/api/internal/jobs/data-retention`;
    console.log(`🔒 Triggering data retention purge at: ${url}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'x-internal-token': INTERNAL_TOKEN,
                'x-internal-purpose': 'jobs',
                'Content-Type': 'application/json',
            },
        });

        const body = await response.json();

        if (!response.ok) {
            console.error(`❌ Job failed with status ${response.status}:`, JSON.stringify(body, null, 2));
            process.exit(1);
        }

        console.log(`✅ Data retention purge completed:`);
        console.log(`   Records scanned: ${body.recordsScanned}`);
        console.log(`   Records purged:  ${body.recordsPurged}`);
        console.log(`   Duration:        ${body.durationMs}ms`);
        console.log(`   Reached limit:   ${body.reachedLimit}`);

        if (body.tables) {
            console.log(`\n   Table breakdown:`);
            for (const t of body.tables) {
                if (t.deleted > 0) {
                    console.log(`     - ${t.table}: ${t.deleted} deleted`);
                }
            }
        }

        process.exit(0);
    } catch (error: any) {
        console.error(`❌ Network error: ${error.message}`);
        process.exit(1);
    }
}

main();
