import fs from 'fs';
import path from 'path';

const META_DIR = path.resolve('./drizzle/meta');
const JOURNAL_PATH = path.join(META_DIR, '_journal.json');
const PREV_SNAPSHOT_PATH = path.join(META_DIR, '0051_snapshot.json');
const NEW_SNAPSHOT_PATH = path.join(META_DIR, '0052_snapshot.json');

const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf8'));
if (!journal.entries.some(e => e.idx === 52)) {
    journal.entries.push({ idx: 52, version: '5', when: Date.now(), tag: '0052_supreme_actions', breakpoints: true });
    fs.writeFileSync(JOURNAL_PATH, JSON.stringify(journal, null, 2) + '\n', 'utf8');
    console.log('✅ Journal updated with entry 52.');
} else { console.log('ℹ️  Journal entry 52 already exists.'); }

const prevSnapshot = JSON.parse(fs.readFileSync(PREV_SNAPSHOT_PATH, 'utf8'));

const newTable = {
    name: 'supreme_actions',
    schema: '',
    columns: {
        id: { name: 'id', type: 'varchar(36)', primaryKey: true, notNull: true, autoincrement: false },
        tenant_id: { name: 'tenant_id', type: 'varchar(36)', primaryKey: false, notNull: true, autoincrement: false },
        action_type: { name: 'action_type', type: 'varchar(80)', primaryKey: false, notNull: true, autoincrement: false },
        action_scope: { name: 'action_scope', type: 'varchar(40)', primaryKey: false, notNull: true, autoincrement: false },
        status: { name: 'status', type: 'varchar(40)', primaryKey: false, notNull: true, autoincrement: false, default: 'PROPOSED' },
        proposed_by: { name: 'proposed_by', type: 'varchar(40)', primaryKey: false, notNull: true, autoincrement: false },
        approved_by: { name: 'approved_by', type: 'varchar(120)', primaryKey: false, notNull: false, autoincrement: false },
        executed_by: { name: 'executed_by', type: 'varchar(40)', primaryKey: false, notNull: false, autoincrement: false },
        payload: { name: 'payload', type: 'json', primaryKey: false, notNull: true, autoincrement: false },
        result: { name: 'result', type: 'json', primaryKey: false, notNull: false, autoincrement: false },
        created_at: { name: 'created_at', type: 'timestamp', primaryKey: false, notNull: true, autoincrement: false, default: 'CURRENT_TIMESTAMP' },
        approved_at: { name: 'approved_at', type: 'timestamp', primaryKey: false, notNull: false, autoincrement: false },
        executed_at: { name: 'executed_at', type: 'timestamp', primaryKey: false, notNull: false, autoincrement: false },
    },
    indexes: {
        idx_sa_tenant_status_time: { name: 'idx_sa_tenant_status_time', columns: ['tenant_id', 'status', 'created_at'], isUnique: false },
        idx_sa_tenant_type_time: { name: 'idx_sa_tenant_type_time', columns: ['tenant_id', 'action_type', 'created_at'], isUnique: false },
    },
    foreignKeys: {},
    compositePrimaryKeys: {},
    uniqueConstraints: {},
    checkConstraints: {},
};

const newSnapshot = {
    ...prevSnapshot,
    version: '5', dialect: 'mysql',
    id: crypto.randomUUID(), prevId: prevSnapshot.id,
    tables: { ...prevSnapshot.tables, supreme_actions: newTable },
};
fs.writeFileSync(NEW_SNAPSHOT_PATH, JSON.stringify(newSnapshot, null, 2) + '\n', 'utf8');
console.log('✅ Snapshot 0052 written.\n🎉 Migration 0052 ready.');
