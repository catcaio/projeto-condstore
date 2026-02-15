-- Seed: Default Tenant (Lojacond)
-- Created: 2026-02-15
-- Description: Creates default tenant for existing Lojacond installation

INSERT INTO `tenants` (`id`, `name`, `twilio_number`, `created_at`)
VALUES (
    'lojacond-default',
    'Lojacond',
    COALESCE(
        (SELECT value FROM (SELECT @twilio_number AS value) AS temp WHERE @twilio_number IS NOT NULL),
        '+14155238886'  -- Fallback if env var not set
    ),
    CURRENT_TIMESTAMP
)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Note: The actual Twilio number should be set via environment variable
-- Set @twilio_number before running this seed:
-- SET @twilio_number = '+14155238886';
