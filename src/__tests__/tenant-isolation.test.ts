/**
 * Tenant isolation suite — CONDSTORE OS §1 (P0/P1 closure).
 *
 * Reusable cross-tenant contract tests (Tenant A vs Tenant B) covering:
 * READ / UPDATE / DELETE / INSERT (tenantId never spoofable via payload) /
 * LIST / COUNT / JOIN-derived reads / UPSERT conflict isolation / route IDOR.
 *
 * Strategy: no live DB. `getDb()` is replaced by a chainable recorder and every
 * `.where(...)` predicate is a REAL drizzle SQL object, flattened to text+params.
 * Tests assert the emitted SQL actually contains `tenant_id = <session tenant>`,
 * not just that `.where()` was called (the previous shallow stub asserted only
 * call presence — see message.repository.test.ts history).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SQL, Name, Param, Column } from 'drizzle-orm';

// ─── Chainable drizzle recorder ──────────────────────────────────────────────

interface RecordedCall {
    op: string;
    table?: unknown;
    where?: unknown;
    set?: unknown;
    values?: unknown;
}

const dbState = vi.hoisted(() => ({
    calls: [] as RecordedCall[],
    rowsQueue: [] as unknown[][],
}));

function resetDbMock() {
    dbState.calls = [];
    dbState.rowsQueue = [];
}

/** Queue result rows consumed (in order) by each awaited query chain. */
function queueRows(...batches: unknown[][]) {
    dbState.rowsQueue.push(...batches);
}

const chain: any = vi.hoisted(() => {
    const c: any = new Proxy(
        {},
        {
            get(_t, prop: string) {
                if (prop === 'then') {
                    return (resolve: (v: unknown) => void) =>
                        resolve(dbState.rowsQueue.length ? dbState.rowsQueue.shift() : []);
                }
                return (...args: unknown[]) => {
                    if (prop === 'select' || prop === 'update' || prop === 'insert' || prop === 'delete') {
                        dbState.calls.push({ op: prop, table: args[0] });
                    } else if (prop === 'from') {
                        dbState.calls.push({ op: 'from', table: args[0] });
                    } else if (prop === 'where') {
                        dbState.calls.push({ op: 'where', where: args[0] });
                    } else if (prop === 'set') {
                        dbState.calls.push({ op: 'set', set: args[0] });
                    } else if (prop === 'values') {
                        dbState.calls.push({ op: 'values', values: args[0] });
                    }
                    return c;
                };
            },
        },
    );
    return c;
});

const mockGetDb = vi.hoisted(() =>
    vi.fn(async () => ({
        select: (...args: unknown[]) => {
            dbState.calls.push({ op: 'select', table: args[0] });
            return chain;
        },
        update: (...args: unknown[]) => {
            dbState.calls.push({ op: 'update', table: args[0] });
            return chain;
        },
        insert: (...args: unknown[]) => {
            dbState.calls.push({ op: 'insert', table: args[0] });
            return chain;
        },
        delete: (...args: unknown[]) => {
            dbState.calls.push({ op: 'delete', table: args[0] });
            return chain;
        },
        transaction: async (cb: (tx: unknown) => unknown) =>
            cb({
                select: (...args: unknown[]) => {
                    dbState.calls.push({ op: 'select', table: args[0] });
                    return chain;
                },
                update: (...args: unknown[]) => {
                    dbState.calls.push({ op: 'update', table: args[0] });
                    return chain;
                },
                insert: (...args: unknown[]) => {
                    dbState.calls.push({ op: 'insert', table: args[0] });
                    return chain;
                },
            }),
        execute: vi.fn(async () => []),
    })),
);

vi.mock('@/infra/db', async (importOriginal) => ({
    ...((await importOriginal()) as Record<string, unknown>),
    getDb: mockGetDb,
}));

vi.mock('@/infra/logger', () => ({
    logger: { error: vi.fn(), info: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/infra/log/logger', () => ({
    structuredLogger: { error: vi.fn(), info: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/infra/redis.client', () => ({
    redisClient: { isAvailable: vi.fn().mockReturnValue(false), del: vi.fn() },
}));

vi.mock('@/modules/finops', () => ({
    planEnforcementService: { invalidateCache: vi.fn() },
}));

// ─── SQL flattening (real drizzle predicates → text + bound params) ──────────

function flattenCondition(condition: unknown, out: { text: string[]; params: unknown[] }) {
    if (condition instanceof SQL) {
        for (const chunk of condition.queryChunks) flattenCondition(chunk, out);
        return;
    }
    if (condition instanceof Name) {
        out.text.push(`\`${String(condition.value)}\``);
        return;
    }
    if (condition instanceof Param) {
        out.text.push('?');
        out.params.push(condition.value);
        return;
    }
    // Bare column references interpolated into sql`` templates (e.g. raw-SQL
    // aggregations) are Column instances, not Name nodes.
    if (condition instanceof Column) {
        out.text.push(`\`${String(condition.name)}\``);
        return;
    }
    if (typeof condition === 'string') {
        out.text.push(condition);
        return;
    }
    if (Array.isArray(condition)) {
        condition.forEach((c) => flattenCondition(c, out));
        return;
    }
    // StringChunk exposes raw SQL text as `.value` (string or string[]).
    // NOTE: drizzle inlines primitive interpolations (string/number) directly
    // into the SQL text instead of binding them as Params — only objects
    // (Date, etc.) become bound params. Tenant checks below therefore accept
    // the tenant as bound param OR as inlined literal equal to the session
    // tenant (server-controlled, never client input).
    if (condition && typeof condition === 'object' && 'value' in condition) {
        const v = (condition as { value?: unknown }).value;
        if (typeof v === 'string') out.text.push(v);
        else if (Array.isArray(v)) v.forEach((s) => typeof s === 'string' && out.text.push(s));
    }
}

function whereSql(whereArg: unknown): { sql: string; params: unknown[] } {
    const out = { text: [] as string[], params: [] as unknown[] };
    flattenCondition(whereArg, out);
    return { sql: out.text.join(''), params: out.params };
}

function recordedWheres(): unknown[] {
    return dbState.calls.filter((c) => c.op === 'where').map((c) => c.where);
}

/**
 * Every recorded WHERE must pin `tenant_id` to exactly the session tenant —
 * either as a bound param or as an inlined literal equal to it (drizzle
 * inlines primitive interpolations; the value is server-controlled).
 */
function expectAllWheresTenantScoped(tenantId: string) {
    const wheres = recordedWheres();
    expect(wheres.length).toBeGreaterThan(0);
    for (const w of wheres) {
        const { sql, params } = whereSql(w);
        expect(sql).toMatch(/tenant_id/i);
        expect(params.includes(tenantId) || sql.includes(tenantId)).toBe(true);
    }
}

function recordedOps(op: string): RecordedCall[] {
    return dbState.calls.filter((c) => c.op === op);
}

// ─── Modules under test (real implementations, mocked db) ───────────────────

import { domineEventsRepository } from '@/infra/repositories/domine-events.repository';
import { domineReadRepository } from '@/infra/repositories/domine-read.repository';
import { deliveriesRepository } from '@/infra/repositories/deliveries.repository';
import { frankEventsRepository } from '@/infra/repositories/frank-events.repository';
import {
    getKnowledgeById,
    updateKnowledgeEntry,
} from '@/modules/frank/knowledge/knowledge.repository';
import { messageRepository } from '@/infra/repositories/message.repository';
import { deliveryLocationEvents } from '@/drizzle/schema';

const TENANT_A = 'tenant-a';
const TENANT_B = 'tenant-b';

beforeEach(() => {
    vi.clearAllMocks();
    resetDbMock();
});

// ─── 1. domine-events: READ / UPDATE / DELETE / INSERT / LIST / COUNT ────────

describe('domine-events repository isolation', () => {
    it('READ: getById scopes by tenant — foreign id yields no row', async () => {
        queueRows([]); // nothing visible under tenant A
        const row = await domineEventsRepository.getById(TENANT_A, 'evt-of-b');
        expect(row).toBeUndefined();
        expectAllWheresTenantScoped(TENANT_A);
    });

    it('UPDATE: markProcessed pins tenant in WHERE', async () => {
        await domineEventsRepository.markProcessed('evt-1', TENANT_A);
        expect(recordedOps('update')).toHaveLength(1);
        expectAllWheresTenantScoped(TENANT_A);
    });

    it('UPDATE: markDone pins tenant in WHERE', async () => {
        await domineEventsRepository.markDone('evt-1', TENANT_A);
        expect(recordedOps('update')).toHaveLength(1);
        expectAllWheresTenantScoped(TENANT_A);
    });

    it('UPDATE: markFailed refuses to touch a foreign-tenant event (no write)', async () => {
        queueRows([{ id: 'evt-1', tenantId: TENANT_B, retryCount: 0 }]);
        await domineEventsRepository.markFailed('evt-1', TENANT_A, 'HANDLER_FAILED', 'boom');
        expect(recordedOps('update')).toHaveLength(0);
        expect(recordedOps('insert')).toHaveLength(0);
        expectAllWheresTenantScoped(TENANT_A);
    });

    it('UPDATE: markFailed writes only when the event belongs to the tenant', async () => {
        queueRows([{ id: 'evt-1', tenantId: TENANT_A, retryCount: 0 }]);
        await domineEventsRepository.markFailed('evt-1', TENANT_A, 'HANDLER_FAILED', 'boom');
        expect(recordedOps('update')).toHaveLength(1);
        expectAllWheresTenantScoped(TENANT_A);
    });

    it('DELETE/INSERT: sendToDLQ on a foreign event writes nothing', async () => {
        queueRows([{ id: 'evt-1', tenantId: TENANT_B, retryCount: 9, type: 'x', payloadJson: null }]);
        await domineEventsRepository.sendToDLQ('evt-1', TENANT_A, 'reason');
        expect(recordedOps('update')).toHaveLength(0);
        expect(recordedOps('insert')).toHaveLength(0);
    });

    it('DELETE: retryFromDLQ scopes the event reset AND the DLQ delete by tenant', async () => {
        queueRows([{ id: 'dlq-1', eventId: 'evt-1', tenantId: TENANT_A }]); // scoped DLQ read
        const ok = await domineEventsRepository.retryFromDLQ(TENANT_A, 'dlq-1');
        expect(ok).toBe(true);
        expect(recordedOps('update')).toHaveLength(1);
        expect(recordedOps('delete')).toHaveLength(1);
        expectAllWheresTenantScoped(TENANT_A);
    });

    it('DELETE: retryFromDLQ with a foreign DLQ id is a no-op', async () => {
        queueRows([]); // scoped read finds nothing under tenant A
        const ok = await domineEventsRepository.retryFromDLQ(TENANT_A, 'dlq-of-b');
        expect(ok).toBe(false);
        expect(recordedOps('update')).toHaveLength(0);
        expect(recordedOps('delete')).toHaveLength(0);
    });

    it('INSERT: publish persists the session tenantId and scopes idempotency', async () => {
        queueRows([]); // no idempotency hit
        const res = await domineEventsRepository.publish({
            tenantId: TENANT_A,
            source: 'cockpit',
            type: 'order_created',
            idempotencyKey: 'idem-1',
        });
        expect(res.inserted).toBe(true);
        expectAllWheresTenantScoped(TENANT_A);
        const values = recordedOps('values');
        expect(values).toHaveLength(1);
        expect(values[0].values).toMatchObject({ tenantId: TENANT_A });
    });

    it('LIST/COUNT: listEvents, listDLQ and getDLQCount scope by tenant', async () => {
        queueRows([], [], []);
        await domineEventsRepository.listEvents(TENANT_A, {});
        await domineEventsRepository.listDLQ(TENANT_A);
        await domineEventsRepository.getDLQCount(TENANT_A);
        expect(recordedWheres()).toHaveLength(3);
        expectAllWheresTenantScoped(TENANT_A);
    });
});

// ─── 2. UPSERT conflict isolation (domine-read) ──────────────────────────────

describe('domine-read upsert isolation', () => {
    it('upsertOrder update path pins tenant — never touches a foreign row', async () => {
        queueRows([{ id: 'row-1', tenantId: TENANT_A, orderId: 'ORD-1' }]);
        await domineReadRepository.upsertOrder(TENANT_A, 'ORD-1', 'paid', {});
        const updates = recordedOps('update');
        expect(updates).toHaveLength(1);
        expectAllWheresTenantScoped(TENANT_A);
    });

    it('upsertOrder insert path stamps the session tenant', async () => {
        queueRows([]);
        await domineReadRepository.upsertOrder(TENANT_A, 'ORD-9', 'paid', {});
        const values = recordedOps('values');
        expect(values).toHaveLength(1);
        expect(values[0].values).toMatchObject({ tenantId: TENANT_A, orderId: 'ORD-9' });
    });

    it('upsertFreightQuoteReadModel update path pins tenant', async () => {
        queueRows([{ id: 'q-1', tenantId: TENANT_A, correlationId: 'c-1', requestId: null }]);
        await domineReadRepository.upsertFreightQuoteReadModel({ tenantId: TENANT_A, correlationId: 'c-1' });
        expect(recordedOps('update')).toHaveLength(1);
        expectAllWheresTenantScoped(TENANT_A);
    });

    it('getOrder / getFreightQuoteByCorrelationId scope by tenant', async () => {
        queueRows([], []);
        await domineReadRepository.getOrder(TENANT_A, 'ORD-1');
        await domineReadRepository.getFreightQuoteByCorrelationId(TENANT_A, 'c-1');
        expect(recordedWheres()).toHaveLength(2);
        expectAllWheresTenantScoped(TENANT_A);
    });
});

// ─── 3. Derived-table reads inherit scope via the parent (deliveries) ────────

describe('deliveries location-event isolation', () => {
    it('foreign deliveryId yields null and never touches location events', async () => {
        queueRows([]); // parent delivery lookup finds nothing under tenant A
        const res = await deliveriesRepository.findLatestLocationEvent(TENANT_A, 'delivery-of-b');
        expect(res).toBeNull();
        // The parent gate must be tenant-scoped…
        const wheres = recordedWheres();
        expect(wheres).toHaveLength(1);
        const { sql, params } = whereSql(wheres[0]);
        expect(sql).toMatch(/tenant_id/i);
        expect(params).toContain(TENANT_A);
        // …and the derived location table must never be touched.
        const fromTables = recordedOps('from').map((c) => c.table);
        expect(fromTables).not.toContain(deliveryLocationEvents);
    });

    it('own deliveryId reads the latest location event', async () => {
        const loc = { deliveryId: 'd-1', lat: '1', lng: '2' };
        queueRows([{ id: 'd-1' }], [loc]);
        const res = await deliveriesRepository.findLatestLocationEvent(TENANT_A, 'd-1');
        expect(res).toEqual(loc);
        // Parent gate is tenant-scoped; the derived-table read inherits scope
        // from it (delivery_location_events has no tenant_id column by design).
        const wheres = recordedWheres();
        expect(wheres).toHaveLength(2);
        const parent = whereSql(wheres[0]);
        expect(parent.sql).toMatch(/tenant_id/i);
        expect(parent.params).toContain(TENANT_A);
        const derived = whereSql(wheres[1]);
        expect(derived.sql).toMatch(/delivery_id/i);
        expect(derived.params).toContain('d-1');
    });

    it('recordLocationUpdate rejects a foreign delivery before any write', async () => {
        queueRows([]); // parent check fails
        await expect(
            deliveriesRepository.recordLocationUpdate({
                tenantId: TENANT_A,
                deliveryId: 'delivery-of-b',
                lat: 1,
                lng: 2,
            }),
        ).rejects.toThrow();
        expect(recordedOps('insert')).toHaveLength(0);
        expect(recordedOps('update')).toHaveLength(0);
    });
});

// ─── 4. frank-events dedup cannot suppress another tenant ────────────────────

describe('frank-events dedup isolation', () => {
    it('dedup window select is tenant-scoped; insert stamps tenant', async () => {
        queueRows([]); // no duplicate under tenant A
        await frankEventsRepository.insertEvent({
            tenantId: TENANT_A,
            kind: 'ai.chat',
            correlationId: 'corr-1',
            payloadJson: {},
            provider: 'p',
            model: 'm',
            latencyMs: 1,
            tokensPrompt: 1,
            tokensCompletion: 1,
            ragUsed: false,
            ragChunks: 0,
            ragLatencyMs: 0,
        });
        expectAllWheresTenantScoped(TENANT_A);
        const values = recordedOps('values');
        expect(values).toHaveLength(1);
        expect(values[0].values).toMatchObject({ tenantId: TENANT_A });
    });
});

// ─── 5. knowledge update: tenantId never spoofable via payload ───────────────

describe('knowledge repository write isolation', () => {
    it('SET clause never contains tenant_id; WHERE pins the session tenant', async () => {
        await updateKnowledgeEntry({ id: 'k-1', tenantId: TENANT_A, title: 't', content: 'c' });
        const sets = recordedOps('set');
        expect(sets).toHaveLength(1);
        expect(sets[0].set).not.toHaveProperty('tenantId');
        expect(sets[0].set).not.toHaveProperty('id');
        expectAllWheresTenantScoped(TENANT_A);
    });

    it('getKnowledgeById scopes by tenant', async () => {
        queueRows([]);
        const row = await getKnowledgeById(TENANT_A, 'k-of-b');
        expect(row).toBeNull();
        expectAllWheresTenantScoped(TENANT_A);
    });
});

// ─── 6. messages: tenant-required writes; removed cross-tenant oracle ────────

describe('message repository isolation contract', () => {
    it('aggregations require tenantId', async () => {
        await expect(messageRepository.getMetricsTotal('')).rejects.toThrow();
        await expect(messageRepository.getMetricsToday('')).rejects.toThrow();
        expect(mockGetDb).not.toHaveBeenCalled();
    });

    it('cross-tenant SID oracle was removed (no unfiltered messages read)', async () => {
        expect((messageRepository as unknown as Record<string, unknown>).existsByMessageSid).toBeUndefined();
    });

    it('aggregations scope by tenant', async () => {
        queueRows([{ count: 0 }], []);
        await messageRepository.getMetricsTotal(TENANT_A);
        expect(recordedWheres().length).toBeGreaterThan(0);
        expectAllWheresTenantScoped(TENANT_A);
    });
});
