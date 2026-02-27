ALTER TABLE tenant_subscriptions ADD COLUMN last_payment_failed_at timestamp;
ALTER TABLE tenant_subscriptions ADD COLUMN cancel_at_period_end boolean NOT NULL DEFAULT false;
ALTER TABLE tenant_subscriptions ADD COLUMN current_period_end timestamp;
