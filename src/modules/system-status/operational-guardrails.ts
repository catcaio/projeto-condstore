export const COCKPIT_METRICS_REFRESH_MS = 30_000;

export const DOMINE_PENDING_EVENT_WARNING_MS = 300_000;
export const DOMINE_PENDING_EVENT_ALERT_MS = 600_000;
export const DOMINE_DLQ_ATTENTION_DEPTH = 5;

export const ACTION_ENGINE_LIFECYCLE_STEPS = [
    'propor',
    'aprovar',
    'executar',
] as const;
