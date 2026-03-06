/**
 * gen-security-incidents-migration.mjs
 * Generates migration 0048 for the security_incidents table without drizzle-kit TUI.
 * Reads 0047_snapshot.json, adds the security_incidents table, writes:
 *   - drizzle/0048_security_incidents.sql
 *   - drizzle/meta/0048_snapshot.json
 *   - updates drizzle/meta/_journal.json
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DRIZZLE_DIR = path.resolve('./drizzle');
const META_DIR = path.join(DRIZZLE_DIR, 'meta');
const JOURNAL_PATH = path.join(META_DIR, '_journal.json');
const PREV_SNAPSHOT_PATH = path.join(META_DIR, '0047_snapshot.json');
const NEW_SQL_PATH = path.join(DRIZZLE_DIR, '0048_security_incidents.sql');
const NEW_SNAPSHOT_PATH = path.join(META_DIR, '0048_snapshot.json');

// ── 1. Migration SQL ──────────────────────────────────────────────────────────
const sqlContent = `CREATE TABLE \`security_incidents\` (
\t\`id\` varchar(36) NOT NULL,
\t\`reason\` varchar(100) NOT NULL,
\t\`count\` int NOT NULL,
\t\`route\` varchar(255),
\t\`ip_hash\` varchar(64),
\t\`window_start\` timestamp NOT NULL,
\t\`window_end\` timestamp NOT NULL,
\t\`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
\tCONSTRAINT \`security_incidents_id\` PRIMARY KEY(\`id\`)
);
--> statement-breakpoint
CREATE INDEX \`idx_sec_incidents_created_at\` ON \`security_incidents\` (\`created_at\`);
--> statement-breakpoint
CREATE INDEX \`idx_sec_incidents_reason_window\` ON \`security_incidents\` (\`reason\`,\`window_end\`);
`;

// ── 2. Security incidents table entry for snapshot ────────────────────────────
const securityIncidentsEntry = {
  "name": "security_incidents",
  "columns": {
    "id": {
      "name": "id",
      "type": "varchar(36)",
      "primaryKey": false,
      "notNull": true,
      "autoincrement": false
    },
    "reason": {
      "name": "reason",
      "type": "varchar(100)",
      "primaryKey": false,
      "notNull": true,
      "autoincrement": false
    },
    "count": {
      "name": "count",
      "type": "int",
      "primaryKey": false,
      "notNull": true,
      "autoincrement": false
    },
    "route": {
      "name": "route",
      "type": "varchar(255)",
      "primaryKey": false,
      "notNull": false,
      "autoincrement": false
    },
    "ip_hash": {
      "name": "ip_hash",
      "type": "varchar(64)",
      "primaryKey": false,
      "notNull": false,
      "autoincrement": false
    },
    "window_start": {
      "name": "window_start",
      "type": "timestamp",
      "primaryKey": false,
      "notNull": true,
      "autoincrement": false
    },
    "window_end": {
      "name": "window_end",
      "type": "timestamp",
      "primaryKey": false,
      "notNull": true,
      "autoincrement": false
    },
    "created_at": {
      "name": "created_at",
      "type": "timestamp",
      "primaryKey": false,
      "notNull": true,
      "autoincrement": false,
      "default": "CURRENT_TIMESTAMP"
    }
  },
  "indexes": {
    "idx_sec_incidents_created_at": {
      "name": "idx_sec_incidents_created_at",
      "columns": ["created_at"],
      "isUnique": false
    },
    "idx_sec_incidents_reason_window": {
      "name": "idx_sec_incidents_reason_window",
      "columns": ["reason", "window_end"],
      "isUnique": false
    }
  },
  "foreignKeys": {},
  "compositePrimaryKeys": {
    "security_incidents_id": {
      "name": "security_incidents_id",
      "columns": ["id"]
    }
  },
  "uniqueConstraints": {},
  "checkConstraint": {}
};

// ── 3. Build new snapshot ─────────────────────────────────────────────────────
const prevSnapshot = JSON.parse(fs.readFileSync(PREV_SNAPSHOT_PATH, 'utf8'));
const newId = crypto.randomUUID();
const prevId = prevSnapshot.id;

const newSnapshot = {
  ...prevSnapshot,
  id: newId,
  prevId: prevId,
  tables: {
    ...prevSnapshot.tables,
    "security_incidents": securityIncidentsEntry
  }
};

// ── 4. Update journal ─────────────────────────────────────────────────────────
const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf8'));
const lastIdx = journal.entries[journal.entries.length - 1].idx;
const newIdx = lastIdx + 1;

journal.entries.push({
  idx: newIdx,
  version: "5",
  when: Date.now(),
  tag: "0048_security_incidents",
  breakpoints: true
});

// ── 5. Write files ────────────────────────────────────────────────────────────
fs.writeFileSync(NEW_SQL_PATH, sqlContent, 'utf8');
console.log(`✅ Written: drizzle/0048_security_incidents.sql`);

fs.writeFileSync(NEW_SNAPSHOT_PATH, JSON.stringify(newSnapshot, null, 2), 'utf8');
console.log(`✅ Written: drizzle/meta/0048_snapshot.json`);

fs.writeFileSync(JOURNAL_PATH, JSON.stringify(journal, null, 2), 'utf8');
console.log(`✅ Updated: drizzle/meta/_journal.json (idx=${newIdx})`);

console.log('\n🎉 Migration 0048 generated successfully.');
console.log('Run: npx drizzle-kit migrate  to apply it to the DB.');
