/**
 * fix-snapshot-drift.cjs
 *
 * Patches the latest drizzle snapshot (0039) so it matches the current schema.ts
 * for the `public_events` table (stale columns) and adds new tables.
 *
 * Writes: 0040_snapshot.json, 0040_snapshot_alignment.sql, updates _journal.json.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DRIZZLE_DIR = path.resolve(__dirname, '../../drizzle');
const META_DIR = path.join(DRIZZLE_DIR, 'meta');

function uuid() {
    return crypto.randomUUID();
}

// ──── 1. Read the latest snapshot ──────────────────────────────────────────
const latestSnapshot = JSON.parse(fs.readFileSync(path.join(META_DIR, '0039_snapshot.json'), 'utf-8'));

const prevId = latestSnapshot.id;

// ──── 2. Fix public_events columns ─────────────────────────────────────────
const pe = latestSnapshot.tables['public_events'];
if (!pe) {
    console.error('❌ public_events table not found in snapshot');
    process.exit(1);
}

// Remove old columns that no longer exist in schema.ts
delete pe.columns['event'];
delete pe.columns['path'];
delete pe.columns['props'];
delete pe.columns['user_agent'];

// Add new columns (matching schema.ts exactly)
pe.columns['event_type'] = {
    name: 'event_type',
    type: 'varchar(64)',
    primaryKey: false,
    notNull: true,
    autoincrement: false,
};
pe.columns['attribution_id'] = {
    name: 'attribution_id',
    type: 'varchar(36)',
    primaryKey: false,
    notNull: false,
    autoincrement: false,
};
pe.columns['payload_json'] = {
    name: 'payload_json',
    type: 'json',
    primaryKey: false,
    notNull: false,
    autoincrement: false,
};
pe.columns['ip_hash'] = {
    name: 'ip_hash',
    type: 'varchar(64)',
    primaryKey: false,
    notNull: false,
    autoincrement: false,
};
pe.columns['ua_hash'] = {
    name: 'ua_hash',
    type: 'varchar(64)',
    primaryKey: false,
    notNull: false,
    autoincrement: false,
};

// Fix tenant_id to be nullable (schema says no .notNull())
pe.columns['tenant_id'].notNull = false;

// ──── 3. Fix public_events indexes ─────────────────────────────────────────
delete pe.indexes['idx_public_events_utm_source_time'];
delete pe.indexes['idx_public_events_utm_campaign_time'];

pe.indexes['idx_public_events_event_time'] = {
    name: 'idx_public_events_event_time',
    columns: ['event_type', 'created_at'],
    isUnique: false,
};

pe.indexes['idx_public_events_attribution_id'] = {
    name: 'idx_public_events_attribution_id',
    columns: ['attribution_id'],
    isUnique: false,
};

// ──── 4. Add domine_tenant_intake_configs table ────────────────────────────
latestSnapshot.tables['domine_tenant_intake_configs'] = {
    name: 'domine_tenant_intake_configs',
    columns: {
        id: { name: 'id', type: 'varchar(36)', primaryKey: true, notNull: true, autoincrement: false },
        tenant_id: { name: 'tenant_id', type: 'varchar(36)', primaryKey: false, notNull: true, autoincrement: false },
        tenant_key: { name: 'tenant_key', type: 'varchar(128)', primaryKey: false, notNull: true, autoincrement: false },
        secret: { name: 'secret', type: 'varchar(255)', primaryKey: false, notNull: false, autoincrement: false },
        allow_unsigned_intake: { name: 'allow_unsigned_intake', type: 'boolean', primaryKey: false, notNull: true, autoincrement: false, default: false },
        created_at: { name: 'created_at', type: 'timestamp', primaryKey: false, notNull: true, autoincrement: false, default: 'CURRENT_TIMESTAMP' },
        updated_at: { name: 'updated_at', type: 'timestamp', primaryKey: false, notNull: true, autoincrement: false, default: 'CURRENT_TIMESTAMP', onUpdate: true },
    },
    indexes: {
        'uq_domine_tenant_intake_configs_key': { name: 'uq_domine_tenant_intake_configs_key', columns: ['tenant_key'], isUnique: true },
        'idx_domine_tenant_intake_configs_tenant': { name: 'idx_domine_tenant_intake_configs_tenant', columns: ['tenant_id'], isUnique: false },
    },
    foreignKeys: {},
    compositePrimaryKeys: {},
    uniqueConstraints: {},
    checkConstraint: {},
};

// ──── 5. Add domine_intake_events table ────────────────────────────────────
latestSnapshot.tables['domine_intake_events'] = {
    name: 'domine_intake_events',
    columns: {
        id: { name: 'id', type: 'varchar(36)', primaryKey: true, notNull: true, autoincrement: false },
        tenant_id: { name: 'tenant_id', type: 'varchar(36)', primaryKey: false, notNull: true, autoincrement: false },
        source: { name: 'source', type: 'varchar(50)', primaryKey: false, notNull: true, autoincrement: false },
        event_type: { name: 'event_type', type: 'varchar(128)', primaryKey: false, notNull: true, autoincrement: false },
        external_id: { name: 'external_id', type: 'varchar(128)', primaryKey: false, notNull: true, autoincrement: false },
        occurred_at: { name: 'occurred_at', type: 'timestamp', primaryKey: false, notNull: true, autoincrement: false },
        received_at: { name: 'received_at', type: 'timestamp', primaryKey: false, notNull: true, autoincrement: false, default: 'CURRENT_TIMESTAMP' },
        payload_redacted: { name: 'payload_redacted', type: 'json', primaryKey: false, notNull: false, autoincrement: false },
        status: { name: 'status', type: 'varchar(30)', primaryKey: false, notNull: true, autoincrement: false, default: "'queued'" },
        rejection_reason: { name: 'rejection_reason', type: 'text', primaryKey: false, notNull: false, autoincrement: false },
    },
    indexes: {
        'uq_domine_intake_events_idempotency': { name: 'uq_domine_intake_events_idempotency', columns: ['tenant_id', 'source', 'event_type', 'external_id'], isUnique: true },
        'idx_domine_intake_events_tenant_status': { name: 'idx_domine_intake_events_tenant_status', columns: ['tenant_id', 'status'], isUnique: false },
    },
    foreignKeys: {},
    compositePrimaryKeys: {},
    uniqueConstraints: {},
    checkConstraint: {},
};

// ──── 6. Update snapshot id ────────────────────────────────────────────────
latestSnapshot.id = uuid();
latestSnapshot.prevId = prevId;

// ──── 7. Write new snapshot ────────────────────────────────────────────────
const newSnapshotPath = path.join(META_DIR, '0040_snapshot.json');
fs.writeFileSync(newSnapshotPath, JSON.stringify(latestSnapshot, null, 2) + '\n');
console.log(`✅ Wrote ${newSnapshotPath}`);

// ──── 8. Write empty SQL migration ─────────────────────────────────────────
const migrationSql = `-- Migration 0040: Snapshot alignment (no SQL changes needed)
-- This migration aligns the drizzle snapshot with the current schema.ts.
-- The actual DB columns were already correct in production.
-- Tables added to snapshot: domine_intake_events, domine_tenant_intake_configs
SELECT 1;
`;
const sqlPath = path.join(DRIZZLE_DIR, '0040_snapshot_alignment.sql');
fs.writeFileSync(sqlPath, migrationSql);
console.log(`✅ Wrote ${sqlPath}`);

// ──── 9. Update journal ────────────────────────────────────────────────────
const journal = JSON.parse(fs.readFileSync(path.join(META_DIR, '_journal.json'), 'utf-8'));
// Remove any existing entry 40 to allow re-running
journal.entries = journal.entries.filter(e => e.idx !== 40);
journal.entries.push({
    idx: 40,
    version: '5',
    when: Date.now(),
    tag: '0040_snapshot_alignment',
    breakpoints: true,
});
fs.writeFileSync(path.join(META_DIR, '_journal.json'), JSON.stringify(journal, null, 2) + '\n');
console.log(`✅ Updated _journal.json with entry 0040`);

console.log('\n🎉 Snapshot drift fixed. Run "npx drizzle-kit generate" to verify.');
