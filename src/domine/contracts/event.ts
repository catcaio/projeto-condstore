import { z } from 'zod';

// ── Event Status ────────────────────────────────────────────────────────────────

export const DOMINE_EVENT_STATUSES = [
    'queued',
    'processing',
    'done',
    'failed',
    'dlq',
] as const;

export type DomineEventStatus = (typeof DOMINE_EVENT_STATUSES)[number];

// ── Event Types ─────────────────────────────────────────────────────────────────

export const DOMINE_SPINE_EVENT_TYPES = [
    'FREIGHT_QUOTE_REQUESTED',
    'WEBHOOK_RECEIVED',
    'KNOWLEDGE_SYNC_REQUESTED',
    'FINOPS_EVENT',
] as const;

export type DomineSpineEventType = (typeof DOMINE_SPINE_EVENT_TYPES)[number];

// ── Source enum ──────────────────────────────────────────────────────────────────

export const DOMINE_EVENT_SOURCES = [
    'cockpit',
    'webhook',
    'connector',
    'frank',
    'http_api',
    'internal',
] as const;

export type DomineEventSource = (typeof DOMINE_EVENT_SOURCES)[number];

// ── Full persisted event schema (what lives in domine_events table) ──────────

export const DomineEventSchema = z.object({
    id: z.string().uuid(),
    tenantId: z.string().min(1),
    type: z.string().min(1).max(128),
    source: z.enum(DOMINE_EVENT_SOURCES),
    payload: z.unknown().optional().default({}),
    status: z.enum(DOMINE_EVENT_STATUSES).default('queued'),
    retryCount: z.number().int().nonnegative().default(0),
    nextRetryAt: z.date().nullable().optional(),
    createdAt: z.date().default(() => new Date()),
    updatedAt: z.date().nullable().optional(),
});

export type DomineEventRecord = z.infer<typeof DomineEventSchema>;

// ── Publish input schema (what callers pass to intake) ──────────────────────

export const PublishInputSchema = z.object({
    tenantId: z.string().min(1, 'tenantId is required'),
    type: z.string().min(1).max(128),
    source: z.enum(DOMINE_EVENT_SOURCES),
    payload: z.unknown().optional().default({}),
    idempotencyKey: z.string().min(1).max(255).optional(),
});

export type PublishInput = z.infer<typeof PublishInputSchema>;
