/**
 * check-backup-sources.mjs
 * Validates presence/configuration of critical backup and restore sources.
 * Outputs structured JSON and exits non-zero if any critical source is missing.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const CHECKS = {
    critical: [],
    warn: [],
};

/** @param {string} key @param {string} label */
function checkEnv(key, label, severity = 'critical') {
    const val = process.env[key];
    const present = Boolean(val && val.trim().length > 0);
    const entry = { check: label, env: key, present };
    if (severity === 'critical') CHECKS.critical.push(entry);
    else CHECKS.warn.push(entry);
    return present;
}

// ── Database ──────────────────────────────────────────────────────────────────
checkEnv('DATABASE_URL', 'TiDB / MySQL connection string', 'critical');

// ── Redis ─────────────────────────────────────────────────────────────────────
const redisOk =
    checkEnv('REDIS_URL', 'Redis URL (Upstash or custom)', 'critical') ||
    checkEnv('UPSTASH_REDIS_REST_URL', 'Upstash Redis REST URL', 'critical');

// Track that at least one Redis env is set
CHECKS.critical.push({
    check: 'At least one Redis env present',
    env: 'REDIS_URL or UPSTASH_REDIS_REST_URL',
    present: Boolean(process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL),
});

// ── Internal tokens ───────────────────────────────────────────────────────────
checkEnv('INTERNAL_DIAG_TOKEN', 'Internal diag token', 'critical');

// At least one job/export token
const jobTokenOk =
    Boolean(process.env.INTERNAL_JOB_TOKEN) ||
    Boolean(process.env.INTERNAL_EXPORT_TOKEN) ||
    Boolean(process.env.INTERNAL_TOKEN);
CHECKS.critical.push({
    check: 'Internal job/export token',
    env: 'INTERNAL_JOB_TOKEN | INTERNAL_EXPORT_TOKEN | INTERNAL_TOKEN',
    present: jobTokenOk,
});

// ── NextAuth / Session ────────────────────────────────────────────────────────
checkEnv('NEXTAUTH_SECRET', 'NextAuth session secret', 'critical');

// ── Stripe (warn only — not needed for core DB restore) ───────────────────────
checkEnv('STRIPE_SECRET_KEY', 'Stripe secret key', 'warn');
checkEnv('STRIPE_WEBHOOK_SECRET', 'Stripe webhook secret', 'warn');

// ── Twilio (warn only) ────────────────────────────────────────────────────────
checkEnv('TWILIO_AUTH_TOKEN', 'Twilio auth token', 'warn');

// ── Migration journal ─────────────────────────────────────────────────────────
const journalPath = path.resolve('./drizzle/meta/_journal.json');
const journalPresent = fs.existsSync(journalPath);
CHECKS.critical.push({
    check: 'Drizzle migration journal present',
    env: 'drizzle/meta/_journal.json',
    present: journalPresent,
});

let latestMigrationId = null;
if (journalPresent) {
    try {
        const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
        const entries = journal.entries || [];
        latestMigrationId = entries.length > 0 ? entries[entries.length - 1].idx : null;
        CHECKS.critical.push({
            check: 'Migration journal readable and non-empty',
            env: 'drizzle/meta/_journal.json entries',
            present: entries.length > 0,
        });
    } catch {
        CHECKS.critical.push({
            check: 'Migration journal parseable',
            env: 'drizzle/meta/_journal.json',
            present: false,
        });
    }
}

// ── Summary ───────────────────────────────────────────────────────────────────
const criticalFails = CHECKS.critical.filter(c => !c.present);
const warnFails = CHECKS.warn.filter(c => !c.present);

const result = {
    status: criticalFails.length === 0 ? (warnFails.length === 0 ? 'PASS' : 'WARN') : 'FAIL',
    latest_migration_id: latestMigrationId,
    critical: CHECKS.critical,
    warnings: CHECKS.warn,
    summary: {
        critical_total: CHECKS.critical.length,
        critical_missing: criticalFails.length,
        warn_total: CHECKS.warn.length,
        warn_missing: warnFails.length,
    },
};

console.log(JSON.stringify(result, null, 2));

if (criticalFails.length > 0) {
    console.error(`\n❌ FAIL: ${criticalFails.length} critical backup source(s) missing:`);
    criticalFails.forEach(c => console.error(`   - ${c.check} (${c.env})`));
    process.exit(1);
} else if (warnFails.length > 0) {
    console.warn(`\n⚠️  WARN: ${warnFails.length} optional source(s) missing (non-critical).`);
    process.exit(0);
} else {
    console.log('\n✅ PASS: All backup sources are configured.');
    process.exit(0);
}
