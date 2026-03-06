/**
 * run-recovery-check.mjs
 * Operational DR readiness check orchestrator.
 * Runs check-backup-sources + runRecoveryIntegrityChecks via tsx, prints PASS/WARN/FAIL.
 */

import { execFileSync } from 'child_process';
import path from 'path';

const PASS = '\x1b[32m✅ PASS\x1b[0m';
const WARN = '\x1b[33m⚠️  WARN\x1b[0m';
const FAIL = '\x1b[31m❌ FAIL\x1b[0m';

let overallStatus = 'PASS';

function setStatus(newStatus) {
    if (newStatus === 'FAIL') overallStatus = 'FAIL';
    else if (newStatus === 'WARN' && overallStatus === 'PASS') overallStatus = 'WARN';
}

console.log('\n🔍 Condstore OS — Disaster Recovery Readiness Check');
console.log('═'.repeat(52));
console.log(`📅 ${new Date().toISOString()}\n`);

// ── Step 1: Backup sources ────────────────────────────────────────────────────
console.log('STEP 1/2 — Backup Sources Check');
console.log('─'.repeat(40));
try {
    execFileSync('node', ['scripts/check-backup-sources.mjs'], {
        stdio: 'inherit',
        cwd: path.resolve('.'),
    });
    console.log(`\nBackup sources: ${PASS}\n`);
} catch {
    console.error(`\nBackup sources: ${FAIL}\n`);
    setStatus('FAIL');
}

// ── Step 2: Recovery integrity (uses tsx) ─────────────────────────────────────
console.log('STEP 2/2 — Recovery Integrity Checks');
console.log('─'.repeat(40));

const integrityScript = `
import { runRecoveryIntegrityChecks } from './src/lib/infra/recovery-integrity.js';

const result = await runRecoveryIntegrityChecks();
console.log(JSON.stringify(result, null, 2));
process.exit(result.status === 'FAIL' ? 1 : (result.status === 'WARN' ? 2 : 0));
`;

import { writeFileSync, unlinkSync } from 'fs';
const tmpScript = path.resolve('/tmp/run-integrity-check.mts');

let integrityStatus = 'PASS';
try {
    writeFileSync(tmpScript, integrityScript, 'utf8');
    try {
        execFileSync('node', ['--import', 'tsx', tmpScript], {
            stdio: 'inherit',
            cwd: path.resolve('.'),
            env: { ...process.env },
        });
        integrityStatus = 'PASS';
    } catch (err) {
        integrityStatus = err.status === 2 ? 'WARN' : 'FAIL';
    }
} finally {
    try { unlinkSync(tmpScript); } catch { /* ignore */ }
}

setStatus(integrityStatus);

const integrityIcon = integrityStatus === 'PASS' ? PASS : integrityStatus === 'WARN' ? WARN : FAIL;
console.log(`\nRecovery integrity: ${integrityIcon}\n`);

// ── Final Summary ─────────────────────────────────────────────────────────────
console.log('═'.repeat(52));
const finalIcon = overallStatus === 'PASS' ? PASS : overallStatus === 'WARN' ? WARN : FAIL;
console.log(`OVERALL RESULT: ${finalIcon}\n`);

if (overallStatus === 'FAIL') {
    console.error('ACTION REQUIRED: Address FAIL items before proceeding with restore.\n');
    process.exit(1);
} else if (overallStatus === 'WARN') {
    console.warn('ADVISORY: Some optional checks failed. System is recoverable but review warnings.\n');
    process.exit(0);
} else {
    console.log('System is recovery-ready. All checks passed.\n');
    process.exit(0);
}
