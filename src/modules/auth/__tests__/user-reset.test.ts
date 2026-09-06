import { describe, it, expect, beforeEach } from 'vitest';
import {
    resetTestUsers,
    resolveAdminEmail,
    ResetUserValidationError,
} from '../user-reset.service';
import {
    users,
    tenants,
    tenantSignupPolicies,
    userUiPrefs,
    notifications,
    invites,
    customerAccounts,
    adminAuditLog,
    governanceTasks,
    governanceTaskComments,
    governanceTaskEvents,
} from '@/drizzle/schema';
import { getTableName } from 'drizzle-orm';

/**
 * In-memory Mock Database simulating Drizzle ORM transaction & table structures
 */
class MockDb {
    public users: any[] = [];
    public tenants: any[] = [];
    public tenantSignupPolicies: any[] = [];
    public userUiPrefs: any[] = [];
    public notifications: any[] = [];
    public invites: any[] = [];
    public customerAccounts: any[] = [];
    public adminAuditLog: any[] = [];
    public governanceTasks: any[] = [];
    public governanceTaskComments: any[] = [];
    public governanceTaskEvents: any[] = [];

    private resolveTableName(tableObj: any): string {
        try {
            const name = getTableName(tableObj);
            if (name) {
                if (name === 'users') return 'users';
                if (name === 'tenants') return 'tenants';
                if (name === 'tenant_signup_policies') return 'tenantSignupPolicies';
                if (name === 'user_ui_prefs') return 'userUiPrefs';
                if (name === 'notifications') return 'notifications';
                if (name === 'invites') return 'invites';
                if (name === 'customer_accounts') return 'customerAccounts';
                if (name === 'admin_audit_log') return 'adminAuditLog';
                if (name === 'governance_tasks') return 'governanceTasks';
                if (name === 'governance_task_comments') return 'governanceTaskComments';
                if (name === 'governance_task_events') return 'governanceTaskEvents';
            }
        } catch {
            // fallback
        }
        return tableObj?._tableName || 'users';
    }

    private extractParamValue(whereClause: any): any {
        if (!whereClause) return undefined;
        if (whereClause.value !== undefined) return whereClause.value;
        if (Array.isArray(whereClause.queryChunks)) {
            const paramChunk = whereClause.queryChunks.find(
                (chunk: any) => chunk && chunk.value !== undefined && chunk.encoder !== undefined
            );
            if (paramChunk) return paramChunk.value;
        }
        return undefined;
    }

    async transaction(callback: (tx: MockDb) => Promise<any>) {
        return callback(this);
    }

    select(fields?: any) {
        const self = this;
        return {
            from(tableObj: any) {
                const tableName = self.resolveTableName(tableObj);
                const records = (self as any)[tableName] || [];
                return {
                    where(whereClause: any) {
                        return records;
                    },
                    limit(limitNum: number) {
                        return records.slice(0, limitNum);
                    },
                    then(resolve: any) {
                        resolve(records);
                    },
                };
            },
        };
    }

    insert(tableObj: any) {
        const self = this;
        const tableName = self.resolveTableName(tableObj);
        return {
            values(val: any) {
                const items = Array.isArray(val) ? val : [val];
                const list = (self as any)[tableName];
                if (list) {
                    list.push(...items);
                }
                return Promise.resolve();
            },
        };
    }

    update(tableObj: any) {
        const self = this;
        const tableName = self.resolveTableName(tableObj);
        return {
            set(patch: any) {
                return {
                    where(whereClause: any) {
                        const records = (self as any)[tableName] as any[];
                        if (records) {
                            const targetValue = self.extractParamValue(whereClause);
                            records.forEach((rec) => {
                                if (
                                    targetValue === undefined ||
                                    rec.id === targetValue ||
                                    rec.tenantId === targetValue ||
                                    rec.email === targetValue
                                ) {
                                    Object.assign(rec, patch);
                                }
                            });
                        }
                        return Promise.resolve();
                    },
                };
            },
        };
    }

    delete(tableObj: any) {
        const self = this;
        const tableName = self.resolveTableName(tableObj);
        return {
            where(whereClause: any) {
                const records = (self as any)[tableName] as any[];
                let count = 0;
                if (records) {
                    const targetValue = self.extractParamValue(whereClause);
                    for (let i = records.length - 1; i >= 0; i--) {
                        const rec = records[i];
                        let shouldDelete = false;
                        if (targetValue !== undefined) {
                            shouldDelete =
                                rec.id === targetValue ||
                                rec.userId === targetValue ||
                                rec.createdBy === targetValue ||
                                rec.email === targetValue;
                        } else {
                            shouldDelete = true;
                        }

                        if (shouldDelete) {
                            records.splice(i, 1);
                            count++;
                        }
                    }
                }
                return Promise.resolve([{ affectedRows: count }]);
            },
        };
    }
}

describe('User Reset Service - resetTestUsers', () => {
    let mockDb: MockDb;

    beforeEach(() => {
        mockDb = new MockDb();
        mockDb.tenants.push({
            id: 'tenant-main',
            name: 'Main Tenant',
            twilioNumber: 'whatsapp:+5511999999999',
        });
    });

    it('Caso 1 — dado um ambiente contendo vários usuários de teste: todos são removidos e somente o administrador local permanece', async () => {
        mockDb.users.push(
            { id: 'usr-admin', email: 'admin@condstore.local', role: 'admin', tenantId: 'tenant-main' },
            { id: 'usr-test-1', email: 'test1@condstore.local', role: 'operator', tenantId: 'tenant-main' },
            { id: 'usr-test-2', email: 'test2@condstore.local', role: 'viewer', tenantId: 'tenant-main' },
            { id: 'usr-test-3', email: 'manager@condstore.local', role: 'manager', tenantId: 'tenant-main' }
        );

        const result = await resetTestUsers({
            adminEmail: 'admin@condstore.local',
            db: mockDb,
        });

        expect(result.success).toBe(true);
        expect(result.removedUserCount).toBe(3);
        expect(result.removedUserIds).toEqual(['usr-test-1', 'usr-test-2', 'usr-test-3']);
        expect(mockDb.users.length).toBe(1);
        expect(mockDb.users[0].email).toBe('admin@condstore.local');
        expect(mockDb.users[0].role).toBe('admin');
    });

    it('Caso 2 — proteção do administrador: o administrador nunca pode ser removido pelo reset', async () => {
        mockDb.users.push(
            { id: 'usr-admin-persistent', email: 'admin@condstore.local', role: 'admin', tenantId: 'tenant-main' },
            { id: 'usr-user-1', email: 'user1@condstore.local', role: 'operator', tenantId: 'tenant-main' }
        );

        const result = await resetTestUsers({
            adminEmail: 'admin@condstore.local',
            db: mockDb,
        });

        expect(result.removedUserIds).not.toContain('usr-admin-persistent');
        const remainingAdmin = mockDb.users.find((u) => u.email === 'admin@condstore.local');
        expect(remainingAdmin).toBeDefined();
        expect(remainingAdmin.id).toBe('usr-admin-persistent');
    });

    it('Caso 3 — permissões: administrador continua com role correta, tenant e acesso', async () => {
        mockDb.users.push({
            id: 'usr-admin-1',
            email: 'admin@condstore.local',
            role: 'operator', // legacy misconfiguration
            tenantId: 'tenant-main',
        });

        const result = await resetTestUsers({
            adminEmail: 'admin@condstore.local',
            db: mockDb,
        });

        expect(result.adminUser.role).toBe('admin');
        expect(result.adminUser.tenantId).toBe('tenant-main');

        const updatedAdmin = mockDb.users.find((u) => u.id === 'usr-admin-1');
        expect(updatedAdmin.role).toBe('admin');
        expect(updatedAdmin.emailVerifiedAt).toBeDefined();

        const policy = mockDb.tenantSignupPolicies.find((p) => p.tenantId === 'tenant-main');
        expect(policy).toBeDefined();
        expect(policy.allowedEmails).toContain('admin@condstore.local');
    });

    it('Caso 4 — relacionamentos: não devem existir sessões, accounts, ui_prefs, invites ou notifications órfãs', async () => {
        mockDb.users.push(
            { id: 'admin-id', email: 'admin@condstore.local', role: 'admin', tenantId: 'tenant-main' },
            { id: 'test-user-id', email: 'test@condstore.local', role: 'operator', tenantId: 'tenant-main' }
        );

        mockDb.userUiPrefs.push(
            { tenantId: 'tenant-main', userId: 'test-user-id', key: 'theme', value: 'dark' },
            { tenantId: 'tenant-main', userId: 'admin-id', key: 'theme', value: 'light' }
        );
        mockDb.notifications.push(
            { tenantId: 'tenant-main', userId: 'test-user-id', title: 'Test Alert' },
            { tenantId: 'tenant-main', userId: 'admin-id', title: 'Admin Alert' }
        );
        mockDb.customerAccounts.push(
            { tenantId: 'tenant-main', userId: 'test-user-id', customerId: 'cust-1' }
        );
        mockDb.invites.push(
            { id: 'inv-1', createdBy: 'test-user-id', email: 'invited@test.com' },
            { id: 'inv-2', createdBy: 'admin-id', email: 'invited2@test.com' }
        );

        const result = await resetTestUsers({
            adminEmail: 'admin@condstore.local',
            db: mockDb,
        });

        expect(result.cleanedRecords.userUiPrefs).toBe(1);
        expect(result.cleanedRecords.notifications).toBe(1);
        expect(result.cleanedRecords.customerAccounts).toBe(1);
        expect(result.cleanedRecords.invites).toBe(1);

        expect(mockDb.userUiPrefs.every((r) => r.userId !== 'test-user-id')).toBe(true);
        expect(mockDb.notifications.every((r) => r.userId !== 'test-user-id')).toBe(true);
        expect(mockDb.customerAccounts.every((r) => r.userId !== 'test-user-id')).toBe(true);
        expect(mockDb.invites.every((r) => r.createdBy !== 'test-user-id')).toBe(true);

        expect(mockDb.userUiPrefs.some((r) => r.userId === 'admin-id')).toBe(true);
        expect(mockDb.notifications.some((r) => r.userId === 'admin-id')).toBe(true);
    });

    it('Caso 5 — idempotência: executar duas ou mais vezes produz o mesmo estado final sem erros ou duplicações', async () => {
        mockDb.users.push(
            { id: 'admin-id', email: 'admin@condstore.local', role: 'admin', tenantId: 'tenant-main' },
            { id: 'test-1', email: 'test1@condstore.local', role: 'operator', tenantId: 'tenant-main' }
        );

        const firstRun = await resetTestUsers({ adminEmail: 'admin@condstore.local', db: mockDb });
        expect(firstRun.removedUserCount).toBe(1);
        expect(mockDb.users.length).toBe(1);

        const secondRun = await resetTestUsers({ adminEmail: 'admin@condstore.local', db: mockDb });
        expect(secondRun.removedUserCount).toBe(0);
        expect(mockDb.users.length).toBe(1);
        expect(mockDb.users[0].email).toBe('admin@condstore.local');

        const thirdRun = await resetTestUsers({ adminEmail: 'admin@condstore.local', db: mockDb });
        expect(thirdRun.removedUserCount).toBe(0);
        expect(mockDb.users.length).toBe(1);
    });

    it('Caso 6 — identificação insegura: falha com segurança sem apagar nenhum usuário', async () => {
        mockDb.users.push(
            { id: 'usr-1', email: 'user1@condstore.local', role: 'operator', tenantId: 'tenant-main' },
            { id: 'usr-2', email: 'user2@condstore.local', role: 'viewer', tenantId: 'tenant-main' }
        );

        await expect(
            resetTestUsers({
                adminEmail: 'not-an-email-address',
                db: mockDb,
            })
        ).rejects.toThrow(ResetUserValidationError);

        expect(mockDb.users.length).toBe(2);

        await expect(
            resetTestUsers({
                adminEmail: '',
                db: mockDb,
            })
        ).rejects.toThrow(ResetUserValidationError);

        expect(mockDb.users.length).toBe(2);
    });
});
