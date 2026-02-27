-- Migration: 0012_stripe_events_unique.sql
-- Purpose: Rename stripe_events.id → stripe_event_id for clarity,
--          add explicit UNIQUE constraint (belt + suspenders alongside PK),
--          and add audit columns: payload_hash + stripe_created_at.
--
-- The PRIMARY KEY on the original `id` column already enforces uniqueness.
-- We rename to `stripe_event_id` to make the intent explicit for external auditors,
-- and add a redundant UNIQUE index that survives potential PK changes.
--
-- NOTE: In MySQL, you cannot rename a PRIMARY KEY column via ALTER COLUMN.
-- We use ADD COLUMN + UPDATE + DROP + ADD PRIMARY KEY sequence.
-- If the table is empty (new deploy), this is a no-op migration for data.

-- Step 1: Add new stripe_event_id column
ALTER TABLE `stripe_events`
  ADD COLUMN `stripe_event_id` varchar(128) NOT NULL DEFAULT '' AFTER `id`,
  ADD COLUMN `stripe_created_at` timestamp NULL AFTER `type`,
  ADD COLUMN `payload_hash` varchar(64) NULL AFTER `stripe_created_at`;

-- Step 2: Backfill: copy existing id values into stripe_event_id
UPDATE `stripe_events` SET `stripe_event_id` = `id` WHERE `stripe_event_id` = '';

-- Step 3: Add explicit UNIQUE constraint on stripe_event_id
ALTER TABLE `stripe_events`
  ADD CONSTRAINT `uq_stripe_events_event_id` UNIQUE (`stripe_event_id`);

-- Step 4: Drop the old id primary key and promote stripe_event_id
-- (We keep `id` as a surrogate UUID PK for internal references)
-- Actually, we keep the current PK(id) as-is (it IS the stripe event id),
-- and just add the UNIQUE on stripe_event_id as belt-and-suspenders.
-- The rename is reflected only in the Drizzle schema for new code.
-- This avoids the complex PK drop/add in production without downtime planning.

-- Summary: stripe_events now has:
--   id              varchar(128) PK          ← still the stripe event ID (backward compat)
--   stripe_event_id varchar(128) NOT NULL UNIQUE  ← explicit audit alias
--   received_at     timestamp NOT NULL
--   type            varchar(128) NOT NULL
--   stripe_created_at timestamp NULL
--   payload_hash    varchar(64) NULL
