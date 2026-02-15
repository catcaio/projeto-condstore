-- Backfill: Associate existing data with default tenant
-- Created: 2026-02-15
-- Description: Updates all existing messages and simulations with default tenant_id

-- Backfill messages table
UPDATE `messages`
SET `tenant_id` = 'lojacond-default'
WHERE `tenant_id` IS NULL;

-- Backfill simulations table
UPDATE `simulations`
SET `tenant_id` = 'lojacond-default'
WHERE `tenant_id` IS NULL;

-- Verify backfill
SELECT 
    'messages' AS table_name,
    COUNT(*) AS total_rows,
    SUM(CASE WHEN tenant_id IS NULL THEN 1 ELSE 0 END) AS null_tenant_id,
    SUM(CASE WHEN tenant_id = 'lojacond-default' THEN 1 ELSE 0 END) AS default_tenant
FROM `messages`
UNION ALL
SELECT 
    'simulations' AS table_name,
    COUNT(*) AS total_rows,
    SUM(CASE WHEN tenant_id IS NULL THEN 1 ELSE 0 END) AS null_tenant_id,
    SUM(CASE WHEN tenant_id = 'lojacond-default' THEN 1 ELSE 0 END) AS default_tenant
FROM `simulations`;
