import { describe, expect, it, vi } from 'vitest';
import { getTableName, type SQL } from 'drizzle-orm';
import { MySqlDialect, type AnyMySqlTable } from 'drizzle-orm/mysql-core';
import { EcommerceRepository, ecommerceSeedId } from './repository';

describe('ecommerce repository SQL tenant boundaries', () => {
    it.each(['listProjects', 'listTasks', 'listLists', 'listSpaces', 'listEvents', 'getConfig'] as const)('%s scopes SQL by tenant', async (method) => {
        const conditions: SQL[] = [];
        const query = {
            where: vi.fn((condition: SQL) => { conditions.push(condition); return query; }),
            orderBy: vi.fn().mockResolvedValue([]), limit: vi.fn().mockResolvedValue([]),
            then: (resolve: (value: unknown[]) => unknown) => Promise.resolve([]).then(resolve),
        };
        const db = { select: () => ({ from: () => query }) };
        const repo = new EcommerceRepository(async () => db as never);
        if (method === 'listProjects' || method === 'getConfig') await repo[method]('tenant-a');
        else await repo[method]('tenant-a', ['resource-1']);
        const compiled = new MySqlDialect().sqlToQuery(conditions[0]);
        expect(compiled.sql).toContain('`tenant_id` = ?');
        expect(compiled.params).toContain('tenant-a');
        if (method !== 'listProjects' && method !== 'getConfig') expect(compiled.params).toContain('resource-1');
    });

    it('avoids unbounded child queries for an empty authorized resource set', async () => {
        const database = vi.fn();
        const repo = new EcommerceRepository(database);
        await expect(repo.listTasks('tenant-a', [])).resolves.toEqual([]);
        await expect(repo.listLists('tenant-a', [])).resolves.toEqual([]);
        await expect(repo.listSpaces('tenant-a', [])).resolves.toEqual([]);
        await expect(repo.listEvents('tenant-a', [])).resolves.toEqual([]);
        expect(database).not.toHaveBeenCalled();
    });
});

function transactionalStore(failOnTable?: string) {
    type Row = Record<string, unknown>;
    let tables = new Map<string, Map<string, Row>>();
    const database = {
        transaction: vi.fn(async (run: (tx: unknown) => Promise<void>) => {
            const pending = new Map([...tables].map(([name, rows]) => [name, new Map(rows)]));
            const tx = {
                select: () => ({ from: () => ({ where: (condition: SQL) => ({ limit: () => ({ for: async () => {
                    const compiled = new MySqlDialect().sqlToQuery(condition);
                    const tenantId = String(compiled.params[0]);
                    return [...(pending.get('tenant_configurations')?.values() ?? [])].filter((row) => row.tenantId === tenantId);
                } }) }) }) }),
                insert: (table: AnyMySqlTable) => ({ values: (row: Row) => {
                    const save = async (set?: Row) => {
                        const name = getTableName(table);
                        if (name === failOnTable) throw new Error('simulated write failure');
                        const rows = pending.get(name) ?? new Map<string, Row>();
                        const key = name === 'tenant_configurations' ? `${row.tenantId}:${row.key}` : String(row.id);
                        const current = rows.get(key);
                        if (!current) rows.set(key, row);
                        else if (set && Object.entries(set).some(([field, value]) => current[field] !== value)) rows.set(key, { ...current, ...set });
                        pending.set(name, rows);
                    };
                    return {
                        onDuplicateKeyUpdate: async (update: { set: Row }) => save(update.set),
                        then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => save().then(resolve, reject),
                    };
                } }),
            };
            await run(tx);
            tables = pending;
        }),
    };
    return { database, rows: (name: string) => [...(tables.get(name)?.values() ?? [])] };
}

describe('explicit administrative demonstration setup', () => {
    it('persists six fronts, one demo project and four deliverables idempotently in one transaction', async () => {
        const store = transactionalStore();
        const repo = new EcommerceRepository(async () => store.database as never);
        const actor = { tenantId: 'tenant-a', userId: 'admin-a', role: 'admin' as const };
        const first = await repo.seedDemonstration(actor);
        const originalProject = store.rows('governance_projects')[0];
        const second = await repo.seedDemonstration({ ...actor, userId: 'admin-b' });
        expect(first).toEqual(second);
        expect(store.database.transaction).toHaveBeenCalledTimes(2);
        expect(store.rows('governance_spaces')).toHaveLength(6);
        expect(store.rows('governance_projects')).toHaveLength(1);
        expect(store.rows('governance_tasks')).toHaveLength(4);
        expect(store.rows('tenant_events')).toHaveLength(1);
        expect(store.rows('governance_task_events')).toHaveLength(1);
        expect(store.rows('governance_task_events')[0]).toMatchObject({
            id: ecommerceSeedId('tenant-a', 'CAT-001:demo.seeded'), tenantId: 'tenant-a',
            taskId: ecommerceSeedId('tenant-a', 'CAT-001:wbs:1'), actorUserId: 'admin-a', eventType: 'demo.seeded',
            payloadJson: { description: 'Exemplo CAT-001 e EAP cadastrados para demonstração, sem execução ou resultado comercial.' },
        });
        expect(store.rows('governance_task_events')[0].payloadJson).not.toHaveProperty('quantity');
        expect(store.rows('governance_projects')[0]).toBe(originalProject);
        expect(originalProject.ecommerceMetadata).toMatchObject({ isDemo: true, source: { type: 'demonstration' }, observedResult: null });
        expect(store.rows('governance_tasks').every((row) => row.status === 'planned' && row.tenantId === 'tenant-a')).toBe(true);
    });

    it('rolls back the entire setup when a child write fails', async () => {
        const store = transactionalStore('governance_tasks');
        const repo = new EcommerceRepository(async () => store.database as never);
        await expect(repo.seedDemonstration({ tenantId: 'tenant-a', userId: 'admin-a', role: 'admin' })).rejects.toThrow('simulated write failure');
        expect(store.rows('governance_spaces')).toEqual([]);
        expect(store.rows('governance_projects')).toEqual([]);
        expect(store.rows('tenant_events')).toEqual([]);
    });

    it('rejects non-admin callers and uses different identities per tenant', async () => {
        const database = vi.fn();
        const repo = new EcommerceRepository(database);
        await expect(repo.seedDemonstration({ tenantId: 'tenant-a', userId: 'manager', role: 'manager' })).rejects.toThrow('Forbidden');
        expect(database).not.toHaveBeenCalled();
        expect(ecommerceSeedId('tenant-a', 'CAT-001')).not.toBe(ecommerceSeedId('tenant-b', 'CAT-001'));
    });

    it('stores tenant workspace configuration and audit atomically while retaining demo data', async () => {
        const store = transactionalStore();
        const repo = new EcommerceRepository(async () => store.database as never);
        const actor = { tenantId: 'tenant-a', userId: 'admin-a', role: 'admin' as const };
        await repo.seedDemonstration(actor);
        await repo.configure(actor, { operationName: 'Operação de teste', workspace: { id: '12345', name: 'Workspace de teste' } });
        expect(store.rows('tenant_configurations')).toHaveLength(1);
        expect(store.rows('tenant_configurations')[0].value).toEqual({
            version: 1, operationName: 'Operação de teste', workspace: { id: '12345', name: 'Workspace de teste' }, syncHistory: [],
        });
        expect(store.rows('tenant_events')).toHaveLength(2);
        expect(store.rows('governance_projects')).toHaveLength(1);
    });

    it('rolls back configuration when audit cannot be persisted', async () => {
        const store = transactionalStore('tenant_events');
        const repo = new EcommerceRepository(async () => store.database as never);
        await expect(repo.configure({ tenantId: 'tenant-a', userId: 'admin-a', role: 'admin' }, {
            operationName: 'Operação de teste', workspace: { id: '12345', name: 'Workspace de teste' },
        })).rejects.toThrow('simulated write failure');
        expect(store.rows('tenant_configurations')).toEqual([]);
    });
});
