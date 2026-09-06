/**
 * Route-level IDOR tests — CONDSTORE OS §1 item 1.3.
 *
 * For every dynamic-[id] route fixed in this pass, a session of Tenant A
 * attempts to touch a resource of Tenant B and must receive 404/403 —
 * never the data. The tenant reaching the repository must always be the
 * session tenant, never a value taken from URL/body.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { SQL, Name, Param, Column } from 'drizzle-orm';

// ─── Minimal drizzle recorder (same technique as tenant-isolation.test.ts) ───

interface RecordedCall {
    op: string;
    where?: unknown;
    arg?: unknown;
}

const dbState = vi.hoisted(() => ({
    calls: [] as RecordedCall[],
    rowsQueue: [] as unknown[][],
}));

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
                    if (prop === 'where') dbState.calls.push({ op: 'where', where: args[0] });
                    else if (prop === 'execute') dbState.calls.push({ op: 'execute', arg: args[0] });
                    else dbState.calls.push({ op: prop });
                    return c;
                };
            },
        },
    );
    return c;
});

const mockGetDb = vi.hoisted(() =>
    vi.fn(async () => ({
        select: () => chain,
        update: () => chain,
        insert: () => chain,
        delete: () => chain,
        execute: (...args: unknown[]) => {
            dbState.calls.push({ op: 'execute', arg: args[0] });
            return chain;
        },
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

// ─── Route-specific mocks ────────────────────────────────────────────────────

const mockRequireAdmin = vi.hoisted(() => vi.fn());
vi.mock('@/infra/auth/guards', () => ({
    requireAdmin: mockRequireAdmin,
}));

const mockRateLimit = vi.hoisted(() => vi.fn());
vi.mock('@/infra/security/frank-rate-limit', () => ({
    applyFrankCockpitRateLimit: mockRateLimit,
}));

const mockUpdateKnowledgeEntry = vi.hoisted(() => vi.fn());
vi.mock('@/modules/frank/knowledge/knowledge.service', () => ({
    getKnowledgeById: vi.fn(),
    updateKnowledgeEntry: mockUpdateKnowledgeEntry,
    deleteKnowledgeEntry: vi.fn(),
}));

const mockRequireSessionTenantMatch = vi.hoisted(() => vi.fn());
vi.mock('@/infra/auth/tenant-route-guard', async (importOriginal) => ({
    ...((await importOriginal()) as Record<string, unknown>),
    requireSessionTenantMatch: mockRequireSessionTenantMatch,
}));

vi.mock('@/infra/config/internal-token', () => ({
    getInternalExportTokenOrThrow: vi.fn(() => {
        throw new Error('no internal token in tests');
    }),
}));

const mockDomineGetById = vi.hoisted(() => vi.fn());
vi.mock('@/infra/repositories/domine-events.repository', () => ({
    domineEventsRepository: { getById: mockDomineGetById },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    // NOTE: drizzle inlines primitive interpolations into the SQL text;
    // tenant assertions below accept bound param OR inlined session literal.
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

const TENANT_A = 'tenant-a';
const TENANT_B = 'tenant-b';

function adminSession(tenantId: string) {
    return { ok: true as const, requestId: 'req-1', session: { tenantId, role: 'admin' } };
}

beforeEach(() => {
    vi.clearAllMocks();
    dbState.calls = [];
    dbState.rowsQueue = [];
    mockRateLimit.mockResolvedValue({ blocked: false });
});

// ─── 1. knowledge PUT: body.tenantId must not override the session ───────────

describe('PUT /api/cockpit/frank/knowledge/[id] IDOR', () => {
    it('ignores a spoofed tenantId in the body — repository receives the session tenant', async () => {
        const { PUT } = await import('@/app/api/cockpit/frank/knowledge/[id]/route');
        mockRequireAdmin.mockResolvedValue(adminSession(TENANT_A));

        const req = new Request('http://localhost/api/cockpit/frank/knowledge/k-1', {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ title: 'Pwned', tenantId: TENANT_B }),
        });

        const res = await PUT(req as never, { params: Promise.resolve({ id: 'k-1' }) });
        expect(res.status).toBe(200);
        expect(mockUpdateKnowledgeEntry).toHaveBeenCalledTimes(1);
        const payload = mockUpdateKnowledgeEntry.mock.calls[0][0] as Record<string, unknown>;
        expect(payload.tenantId).toBe(TENANT_A);
        expect(payload.id).toBe('k-1');
        expect(payload.title).toBe('Pwned');
    });
});

// ─── 2. domine/actions lookup_freight: correlationId is tenant-scoped ─────────

describe('POST /api/tenants/[tenantId]/domine/actions lookup_freight IDOR', () => {
    it("tenant A cannot read tenant B's quote via correlationId — returns null", async () => {
        const { POST } = await import('@/app/api/tenants/[tenantId]/domine/actions/route');
        mockRequireSessionTenantMatch.mockResolvedValue({
            ok: true,
            tenantId: TENANT_A,
            sessionUser: { role: 'admin', tenantId: TENANT_A },
        });
        dbState.rowsQueue.push([]); // nothing visible under tenant A

        const req = new NextRequest(`http://localhost/api/tenants/${TENANT_A}/domine/actions`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ action: 'lookup_freight', parameters: { correlationId: 'corr-of-b' } }),
        });

        const res = await POST(req as never, { params: Promise.resolve({ tenantId: TENANT_A }) });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data).toBeNull();

        const wheres = dbState.calls.filter((c) => c.op === 'where').map((c) => c.where);
        expect(wheres.length).toBeGreaterThan(0);
        for (const w of wheres) {
            const { sql, params } = whereSql(w);
            expect(sql).toMatch(/tenant_id/i);
            expect(params).toContain(TENANT_A);
            expect(sql).toMatch(/correlation_id/i);
            expect(params).toContain('corr-of-b');
        }
    });
});

// ─── 3. domine/events/[id]: foreign id → 404, never the payload ──────────────

describe('GET /api/tenants/[tenantId]/domine/events/[id] IDOR', () => {
    it('passes the session tenant to the repository and 404s a foreign id', async () => {
        const { GET } = await import('@/app/api/tenants/[tenantId]/domine/events/[id]/route');
        mockRequireSessionTenantMatch.mockResolvedValue({
            ok: true,
            tenantId: TENANT_A,
            sessionUser: { role: 'admin', tenantId: TENANT_A },
        });
        // Repository (now tenant-scoped) finds nothing for tenant A + foreign id
        mockDomineGetById.mockImplementation(async (tenantId: string) =>
            tenantId === TENANT_A ? null : { id: 'evt-b', tenantId: TENANT_B },
        );

        const req = new NextRequest(`http://localhost/api/tenants/${TENANT_A}/domine/events/evt-b`);
        const res = await GET(req as never, {
            params: Promise.resolve({ tenantId: TENANT_A, id: 'evt-b' }),
        });

        expect(mockDomineGetById).toHaveBeenCalledWith(TENANT_A, 'evt-b');
        expect(res.status).toBe(404);
    });

    it('returns 403 when a row slips through with a mismatched tenant (defense in depth)', async () => {
        const { GET } = await import('@/app/api/tenants/[tenantId]/domine/events/[id]/route');
        mockRequireSessionTenantMatch.mockResolvedValue({
            ok: true,
            tenantId: TENANT_A,
            sessionUser: { role: 'admin', tenantId: TENANT_A },
        });
        mockDomineGetById.mockResolvedValue({
            id: 'evt-b',
            tenantId: TENANT_B,
            source: 'cockpit',
            type: 'x',
            status: 'queued',
            idempotencyKey: 'k',
            payloadJson: {},
            createdAt: new Date(),
        });

        const req = new NextRequest(`http://localhost/api/tenants/${TENANT_A}/domine/events/evt-b`);
        const res = await GET(req as never, {
            params: Promise.resolve({ tenantId: TENANT_A, id: 'evt-b' }),
        });

        expect(res.status).toBe(403);
    });
});

// ─── 4. internal/ops: aggregates pinned to the session tenant ────────────────

describe('GET /api/internal/ops tenant-scoped aggregates', () => {
    it('pins every aggregate to the session tenant — never global counts', async () => {
        const { GET } = await import('@/app/api/internal/ops/route');
        mockRequireAdmin.mockResolvedValue(adminSession(TENANT_A));
        // mysql2 execute() resolves [rows, fields]; route destructures [result] then [0]?.count
        dbState.rowsQueue.push([[{ count: 5 }]], [[{ count: 2 }]], [[{ count: 1 }]]);

        const req = new NextRequest('http://localhost/api/internal/ops');
        const res = await GET(req as never);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.sessions_started_last_24h).toBe(5);

        const execs = dbState.calls.filter((c) => c.op === 'execute');
        expect(execs).toHaveLength(3);
        for (const e of execs) {
            const { sql, params } = whereSql(e.arg);
            expect(sql).toMatch(/tenant_id/i);
            expect(params.includes(TENANT_A) || sql.includes(TENANT_A)).toBe(true);
        }
    });
});
