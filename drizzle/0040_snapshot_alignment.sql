-- Migration 0040: Snapshot alignment (no SQL changes needed)
-- This migration aligns the drizzle snapshot with the current schema.ts.
-- The actual DB columns were already correct in production.
-- Tables added to snapshot: domine_intake_events, domine_tenant_intake_configs
SELECT 1;
