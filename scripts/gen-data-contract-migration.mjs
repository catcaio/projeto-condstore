/**
 * gen-data-contract-migration.mjs
 * Adds journal entry 0049 and creates snapshot for tenant_data_contract_status.
 * Mirrors gen-security-incidents-migration.mjs pattern.
 */

import fs from 'fs';
import path from 'path';

const DRIZZLE_DIR = path.resolve('./drizzle');
const META_DIR = path.join(DRIZZLE_DIR, 'meta');
const JOURNAL_PATH = path.join(META_DIR, '_journal.json');
const PREV_SNAPSHOT_PATH = path.join(META_DIR, '0048_snapshot.json');
const NEW_SNAPSHOT_PATH = path.join(META_DIR, '0049_snapshot.json');

// ── 1. Journal entry ──────────────────────────────────────────────────────────
const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf8'));

const alreadyExists = journal.entries.some(e => e.idx === 49);
if (!alreadyExists) {
    journal.entries.push({
        idx: 49,
        version: '5',
        when: Date.now(),
        tag: '0049_tenant_data_contract_status',
        breakpoints: true,
    });
    fs.writeFileSync(JOURNAL_PATH, JSON.stringify(journal, null, 2) + '\n', 'utf8');
    console.log('✅ Journal updated with entry 49.');
} else {
    console.log('ℹ️  Journal entry 49 already exists.');
}

// ── 2. Snapshot ───────────────────────────────────────────────────────────────
const prevSnapshot = JSON.parse(fs.readFileSync(PREV_SNAPSHOT_PATH, 'utf8'));

const newTable = {
    name: 'tenant_data_contract_status',
    schema: '',
    columns: {
        tenant_id: { name: 'tenant_id', type: 'varchar(36)', primaryKey: true, notNull: true, autoincrement: false },
        acquisition_ready: { name: 'acquisition_ready', type: 'boolean', primaryKey: false, notNull: true, autoincrement: false, default: false },
        conversion_ready: { name: 'conversion_ready', type: 'boolean', primaryKey: false, notNull: true, autoincrement: false, default: false },
        revenue_ready: { name: 'revenue_ready', type: 'boolean', primaryKey: false, notNull: true, autoincrement: false, default: false },
        retention_ready: { name: 'retention_ready', type: 'boolean', primaryKey: false, notNull: true, autoincrement: false, default: false },
        operational_ready: { name: 'operational_ready', type: 'boolean', primaryKey: false, notNull: true, autoincrement: false, default: false },
        last_checked_at: { name: 'last_checked_at', type: 'timestamp', primaryKey: false, notNull: true, autoincrement: false, default: 'CURRENT_TIMESTAMP' },
    },
    indexes: {},
    foreignKeys: {},
    compositePrimaryKeys: {},
    uniqueConstraints: {},
    checkConstraints: {},
};

const newSnapshot = {
    ...prevSnapshot,
    version: '5',
    dialect: 'mysql',
    id: crypto.randomUUID(),
    prevId: prevSnapshot.id,
    tables: {
        ...prevSnapshot.tables,
        tenant_data_contract_status: newTable,
    },
};

fs.writeFileSync(NEW_SNAPSHOT_PATH, JSON.stringify(newSnapshot, null, 2) + '\n', 'utf8');
console.log('✅ Snapshot 0049 written.');
console.log('\n🎉 Migration 0049 artifacts ready. Apply with: node scripts/apply-data-contract-migration.mjs');
