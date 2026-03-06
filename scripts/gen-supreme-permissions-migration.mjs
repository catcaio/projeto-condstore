/**
 * gen-supreme-permissions-migration.mjs
 * Adds journal entry 0050 and creates snapshot for tenant_supreme_permissions.
 */

import fs from 'fs';
import path from 'path';

const META_DIR = path.resolve('./drizzle/meta');
const JOURNAL_PATH = path.join(META_DIR, '_journal.json');
const PREV_SNAPSHOT_PATH = path.join(META_DIR, '0049_snapshot.json');
const NEW_SNAPSHOT_PATH = path.join(META_DIR, '0050_snapshot.json');

// ── 1. Journal ────────────────────────────────────────────────────────────────
const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf8'));
if (!journal.entries.some(e => e.idx === 50)) {
    journal.entries.push({
        idx: 50,
        version: '5',
        when: Date.now(),
        tag: '0050_tenant_supreme_permissions',
        breakpoints: true,
    });
    fs.writeFileSync(JOURNAL_PATH, JSON.stringify(journal, null, 2) + '\n', 'utf8');
    console.log('✅ Journal updated with entry 50.');
} else {
    console.log('ℹ️  Journal entry 50 already exists.');
}

// ── 2. Snapshot ───────────────────────────────────────────────────────────────
const prevSnapshot = JSON.parse(fs.readFileSync(PREV_SNAPSHOT_PATH, 'utf8'));

const newTable = {
    name: 'tenant_supreme_permissions',
    schema: '',
    columns: {
        tenant_id: { name: 'tenant_id', type: 'varchar(36)', primaryKey: true, notNull: true, autoincrement: false },
        allow_read_metrics: { name: 'allow_read_metrics', type: 'boolean', primaryKey: false, notNull: true, autoincrement: false, default: true },
        allow_generate_recommendations: { name: 'allow_generate_recommendations', type: 'boolean', primaryKey: false, notNull: true, autoincrement: false, default: true },
        allow_execute_optimizations: { name: 'allow_execute_optimizations', type: 'boolean', primaryKey: false, notNull: true, autoincrement: false, default: false },
        allow_ads_budget_changes: { name: 'allow_ads_budget_changes', type: 'boolean', primaryKey: false, notNull: true, autoincrement: false, default: false },
        allow_crm_actions: { name: 'allow_crm_actions', type: 'boolean', primaryKey: false, notNull: true, autoincrement: false, default: false },
        allow_whatsapp_automation: { name: 'allow_whatsapp_automation', type: 'boolean', primaryKey: false, notNull: true, autoincrement: false, default: true },
        updated_at: { name: 'updated_at', type: 'timestamp', primaryKey: false, notNull: true, autoincrement: false, default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
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
    tables: { ...prevSnapshot.tables, tenant_supreme_permissions: newTable },
};

fs.writeFileSync(NEW_SNAPSHOT_PATH, JSON.stringify(newSnapshot, null, 2) + '\n', 'utf8');
console.log('✅ Snapshot 0050 written.\n🎉 Migration 0050 ready.');
