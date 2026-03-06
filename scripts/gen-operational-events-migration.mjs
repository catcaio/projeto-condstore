/**
 * gen-operational-events-migration.mjs
 * Adds journal entry 0051 and creates snapshot for operational_events.
 */
import fs from 'fs';
import path from 'path';

const META_DIR = path.resolve('./drizzle/meta');
const JOURNAL_PATH = path.join(META_DIR, '_journal.json');
const PREV_SNAPSHOT_PATH = path.join(META_DIR, '0050_snapshot.json');
const NEW_SNAPSHOT_PATH = path.join(META_DIR, '0051_snapshot.json');

const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf8'));
if (!journal.entries.some(e => e.idx === 51)) {
    journal.entries.push({ idx: 51, version: '5', when: Date.now(), tag: '0051_operational_events', breakpoints: true });
    fs.writeFileSync(JOURNAL_PATH, JSON.stringify(journal, null, 2) + '\n', 'utf8');
    console.log('✅ Journal updated with entry 51.');
} else { console.log('ℹ️  Journal entry 51 already exists.'); }

const prevSnapshot = JSON.parse(fs.readFileSync(PREV_SNAPSHOT_PATH, 'utf8'));

const newTable = {
    name: 'operational_events',
    schema: '',
    columns: {
        id: { name: 'id', type: 'varchar(36)', primaryKey: true, notNull: true, autoincrement: false },
        tenant_id: { name: 'tenant_id', type: 'varchar(36)', primaryKey: false, notNull: true, autoincrement: false },
        event_type: { name: 'event_type', type: 'varchar(80)', primaryKey: false, notNull: true, autoincrement: false },
        event_domain: { name: 'event_domain', type: 'varchar(40)', primaryKey: false, notNull: true, autoincrement: false },
        entity_id: { name: 'entity_id', type: 'varchar(120)', primaryKey: false, notNull: false, autoincrement: false },
        customer_id: { name: 'customer_id', type: 'varchar(120)', primaryKey: false, notNull: false, autoincrement: false },
        session_id: { name: 'session_id', type: 'varchar(120)', primaryKey: false, notNull: false, autoincrement: false },
        attribution_id: { name: 'attribution_id', type: 'varchar(120)', primaryKey: false, notNull: false, autoincrement: false },
        payload: { name: 'payload', type: 'json', primaryKey: false, notNull: true, autoincrement: false },
        created_at: { name: 'created_at', type: 'timestamp', primaryKey: false, notNull: true, autoincrement: false, default: 'CURRENT_TIMESTAMP' },
    },
    indexes: {
        idx_op_events_tenant_domain_time: { name: 'idx_op_events_tenant_domain_time', columns: ['tenant_id', 'event_domain', 'created_at'], isUnique: false },
        idx_op_events_tenant_type_time: { name: 'idx_op_events_tenant_type_time', columns: ['tenant_id', 'event_type', 'created_at'], isUnique: false },
        idx_op_events_tenant_customer_time: { name: 'idx_op_events_tenant_customer_time', columns: ['tenant_id', 'customer_id', 'created_at'], isUnique: false },
    },
    foreignKeys: {},
    compositePrimaryKeys: {},
    uniqueConstraints: {},
    checkConstraints: {},
};

const newSnapshot = { ...prevSnapshot, version: '5', dialect: 'mysql', id: crypto.randomUUID(), prevId: prevSnapshot.id, tables: { ...prevSnapshot.tables, operational_events: newTable } };
fs.writeFileSync(NEW_SNAPSHOT_PATH, JSON.stringify(newSnapshot, null, 2) + '\n', 'utf8');
console.log('✅ Snapshot 0051 written.\n🎉 Migration 0051 ready.');
