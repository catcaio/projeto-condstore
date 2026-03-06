import fs from 'fs';
import path from 'path';

const META_DIR = path.resolve('./drizzle/meta');
const JOURNAL_PATH = path.join(META_DIR, '_journal.json');
const PREV_SNAPSHOT_PATH = path.join(META_DIR, '0053_snapshot.json');
const NEW_SNAPSHOT_PATH = path.join(META_DIR, '0054_snapshot.json');

const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf8'));
if (!journal.entries.some(e => e.idx === 54)) {
    journal.entries.push({ idx: 54, version: '5', when: Date.now(), tag: '0054_supreme_playbooks', breakpoints: true });
    fs.writeFileSync(JOURNAL_PATH, JSON.stringify(journal, null, 2) + '\n', 'utf8');
    console.log('✅ Journal updated with entry 54.');
} else { console.log('ℹ️  Journal entry 54 already exists.'); }

const prevSnapshot = JSON.parse(fs.readFileSync(PREV_SNAPSHOT_PATH, 'utf8'));

const newTable = {
    name: 'supreme_playbooks',
    schema: '',
    columns: {
        id: { name: 'id', type: 'varchar(36)', primaryKey: true, notNull: true, autoincrement: false },
        playbook_name: { name: 'playbook_name', type: 'varchar(120)', primaryKey: false, notNull: true, autoincrement: false },
        playbook_domain: { name: 'playbook_domain', type: 'varchar(40)', primaryKey: false, notNull: true, autoincrement: false },
        trigger_finding_type: { name: 'trigger_finding_type', type: 'varchar(80)', primaryKey: false, notNull: true, autoincrement: false },
        action_sequence: { name: 'action_sequence', type: 'json', primaryKey: false, notNull: true, autoincrement: false },
        expected_metric: { name: 'expected_metric', type: 'varchar(80)', primaryKey: false, notNull: true, autoincrement: false },
        success_threshold: { name: 'success_threshold', type: 'double', primaryKey: false, notNull: true, autoincrement: false },
        is_active: { name: 'is_active', type: 'boolean', primaryKey: false, notNull: true, autoincrement: false, default: true },
        created_at: { name: 'created_at', type: 'timestamp', primaryKey: false, notNull: true, autoincrement: false, default: 'CURRENT_TIMESTAMP' },
        updated_at: { name: 'updated_at', type: 'timestamp', primaryKey: false, notNull: true, autoincrement: false, default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
    },
    indexes: {
        idx_sp_domain: { name: 'idx_sp_domain', columns: ['playbook_domain'], isUnique: false },
        idx_sp_trigger: { name: 'idx_sp_trigger', columns: ['trigger_finding_type'], isUnique: false },
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
    tables: { ...prevSnapshot.tables, supreme_playbooks: newTable },
};
fs.writeFileSync(NEW_SNAPSHOT_PATH, JSON.stringify(newSnapshot, null, 2) + '\n', 'utf8');
console.log('✅ Snapshot 0054 written.\n🎉 Migration 0054 ready.');
