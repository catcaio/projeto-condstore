import fs from 'fs';
import path from 'path';

const META_DIR = path.resolve('./drizzle/meta');
const JOURNAL_PATH = path.join(META_DIR, '_journal.json');
const PREV_SNAPSHOT_PATH = path.join(META_DIR, '0052_snapshot.json');
const NEW_SNAPSHOT_PATH = path.join(META_DIR, '0053_snapshot.json');

const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf8'));
if (!journal.entries.some(e => e.idx === 53)) {
    journal.entries.push({ idx: 53, version: '5', when: Date.now(), tag: '0053_supreme_findings', breakpoints: true });
    fs.writeFileSync(JOURNAL_PATH, JSON.stringify(journal, null, 2) + '\n', 'utf8');
    console.log('✅ Journal updated with entry 53.');
} else { console.log('ℹ️  Journal entry 53 already exists.'); }

const prevSnapshot = JSON.parse(fs.readFileSync(PREV_SNAPSHOT_PATH, 'utf8'));

const newTable = {
    name: 'supreme_findings',
    schema: '',
    columns: {
        id: { name: 'id', type: 'varchar(36)', primaryKey: true, notNull: true, autoincrement: false },
        tenant_id: { name: 'tenant_id', type: 'varchar(36)', primaryKey: false, notNull: true, autoincrement: false },
        finding_type: { name: 'finding_type', type: 'varchar(80)', primaryKey: false, notNull: true, autcrement: false },
        finding_domain: { name: 'finding_domain', type: 'varchar(40)', primaryKey: false, notNull: true, autoincrement: false },
        severity: { name: 'severity', type: 'varchar(20)', primaryKey: false, notNull: true, autoincrement: false },
        title: { name: 'title', type: 'varchar(160)', primaryKey: false, notNull: true, autoincrement: false },
        summary: { name: 'summary', type: 'text', primaryKey: false, notNull: true, autoincrement: false },
        evidence: { name: 'evidence', type: 'json', primaryKey: false, notNull: true, autoincrement: false },
        recommended_action_type: { name: 'recommended_action_type', type: 'varchar(80)', primaryKey: false, notNull: false, autoincrement: false },
        recommended_action_payload: { name: 'recommended_action_payload', type: 'json', primaryKey: false, notNull: false, autoincrement: false },
        status: { name: 'status', type: 'varchar(40)', primaryKey: false, notNull: true, autoincrement: false, default: 'OPEN' },
        created_at: { name: 'created_at', type: 'timestamp', primaryKey: false, notNull: true, autoincrement: false, default: 'CURRENT_TIMESTAMP' },
        resolved_at: { name: 'resolved_at', type: 'timestamp', primaryKey: false, notNull: false, autoincrement: false },
    },
    indexes: {
        idx_sf_tenant_status_time: { name: 'idx_sf_tenant_status_time', columns: ['tenant_id', 'status', 'created_at'], isUnique: false },
        idx_sf_tenant_domain_time: { name: 'idx_sf_tenant_domain_time', columns: ['tenant_id', 'finding_domain', 'created_at'], isUnique: false },
        idx_sf_tenant_severity_time: { name: 'idx_sf_tenant_severity_time', columns: ['tenant_id', 'severity', 'created_at'], isUnique: false },
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
    tables: { ...prevSnapshot.tables, supreme_findings: newTable },
};
fs.writeFileSync(NEW_SNAPSHOT_PATH, JSON.stringify(newSnapshot, null, 2) + '\n', 'utf8');
console.log('✅ Snapshot 0053 written.\n🎉 Migration 0053 ready.');
