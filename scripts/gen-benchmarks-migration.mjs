import fs from 'fs';
import path from 'path';

const META_DIR = path.resolve('./drizzle/meta');
const JOURNAL_PATH = path.join(META_DIR, '_journal.json');
const PREV_SNAPSHOT_PATH = path.join(META_DIR, '0054_snapshot.json');
const NEW_SNAPSHOT_PATH = path.join(META_DIR, '0055_snapshot.json');

const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf8'));
if (!journal.entries.some(e => e.idx === 55)) {
    journal.entries.push({ idx: 55, version: '5', when: Date.now(), tag: '0055_supreme_benchmarks', breakpoints: true });
    fs.writeFileSync(JOURNAL_PATH, JSON.stringify(journal, null, 2) + '\n', 'utf8');
    console.log('✅ Journal updated with entry 55.');
} else { console.log('ℹ️  Journal entry 55 already exists.'); }

const prevSnapshot = JSON.parse(fs.readFileSync(PREV_SNAPSHOT_PATH, 'utf8'));

const newTable = {
    name: 'supreme_benchmarks',
    schema: '',
    columns: {
        id: { name: 'id', type: 'varchar(36)', primaryKey: true, notNull: true, autoincrement: false },
        benchmark_domain: { name: 'benchmark_domain', type: 'varchar(40)', primaryKey: false, notNull: true, autoincrement: false },
        benchmark_metric: { name: 'benchmark_metric', type: 'varchar(80)', primaryKey: false, notNull: true, autoincrement: false },
        segment_key: { name: 'segment_key', type: 'varchar(120)', primaryKey: false, notNull: true, autoincrement: false },
        sample_size: { name: 'sample_size', type: 'int', primaryKey: false, notNull: true, autoincrement: false },
        p25: { name: 'p25', type: 'double', primaryKey: false, notNull: false, autoincrement: false },
        p50: { name: 'p50', type: 'double', primaryKey: false, notNull: false, autoincrement: false },
        p75: { name: 'p75', type: 'double', primaryKey: false, notNull: false, autoincrement: false },
        computed_at: { name: 'computed_at', type: 'timestamp', primaryKey: false, notNull: true, autoincrement: false, default: 'CURRENT_TIMESTAMP' },
    },
    indexes: {
        idx_sb_domain_metric_segment: { name: 'idx_sb_domain_metric_segment', columns: ['benchmark_domain', 'benchmark_metric', 'segment_key'], isUnique: false },
        idx_sb_computed_at: { name: 'idx_sb_computed_at', columns: ['computed_at'], isUnique: false },
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
    tables: { ...prevSnapshot.tables, supreme_benchmarks: newTable },
};
fs.writeFileSync(NEW_SNAPSHOT_PATH, JSON.stringify(newSnapshot, null, 2) + '\n', 'utf8');
console.log('✅ Snapshot 0055 written.\n🎉 Migration 0055 ready.');
