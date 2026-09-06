import { randomUUID, randomBytes } from 'crypto';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '@/infra/db';
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
    type UserRecord,
} from '@/drizzle/schema';
import { hashPassword } from '@/infra/auth/password';
import { structuredLogger } from '@/infra/log/logger';

export class ResetUserValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ResetUserValidationError';
    }
}

export interface ResetOptions {
    /**
     * Explicit email address for the local administrator to preserve.
     * If omitted, attempts to read env vars or defaults to 'admin@condstore.local'.
     */
    adminEmail?: string;

    /**
     * Explicit password to set for the preserved admin user.
     * If omitted, attempts to read env vars or generates a secure random password hash.
     */
    adminPassword?: string;

    /**
     * Optional tenant ID for the admin user.
     * Defaults to existing tenant ID, or 'condstore-admin-tenant' if none exists.
     */
    tenantId?: string;

    /**
     * Optional explicit database instance for dependency injection / testing.
     */
    db?: any;
}

export interface ResetResult {
    success: boolean;
    adminUser: {
        id: string;
        email: string;
        tenantId: string;
        role: string;
    };
    removedUserCount: number;
    removedUserIds: string[];
    cleanedRecords: {
        userUiPrefs: number;
        notifications: number;
        invites: number;
        customerAccounts: number;
    };
}

/**
 * Validates and normalizes email address.
 * Throws ResetUserValidationError if invalid or ambiguous.
 */
export function resolveAdminEmail(explicitEmail?: string): string {
    const rawEmail =
        explicitEmail !== undefined && explicitEmail !== null
            ? explicitEmail
            : process.env.ADMIN_SEED_EMAIL ||
              process.env.DEV_ADMIN_EMAIL ||
              process.env.ADMIN_EMAIL ||
              'admin@condstore.local';

    if (typeof rawEmail !== 'string' || !rawEmail.trim()) {
        throw new ResetUserValidationError('Admin email identification failed: Email is empty or invalid.');
    }

    const normalized = rawEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalized)) {
        throw new ResetUserValidationError(
            `Admin email identification failed: '${rawEmail}' is not a valid email address.`
        );
    }

    return normalized;
}

function extractAffectedRows(res: any): number {
    if (typeof res === 'number') return res;
    if (res?.[0]?.affectedRows !== undefined) return Number(res[0].affectedRows);
    if (res?.affectedRows !== undefined) return Number(res.affectedRows);
    if (res?.rowCount !== undefined) return Number(res.rowCount);
    if (Array.isArray(res)) return res.length;
    return 0;
}

/**
 * Executes a deterministic, safe, and idempotent reset of test users.
 * All test users are eliminated, while preserving exclusively the local administrator account.
 */
export async function resetTestUsers(options: ResetOptions = {}): Promise<ResetResult> {
    const adminEmail = resolveAdminEmail(options.adminEmail);
    const db = options.db || (await getDb());

    const adminPassword =
        options.adminPassword ||
        process.env.ADMIN_SEED_PASSWORD ||
        process.env.DEV_ADMIN_PASSWORD ||
        randomBytes(24).toString('hex');

    // Execute in transaction to ensure atomic execution and referential safety
    return await db.transaction(async (tx: any) => {
        // 1. Identify existing users in the database
        const allUsers: UserRecord[] = await tx.select().from(users);

        // Find existing admin user by email
        const existingAdmin = allUsers.find((u) => u.email.toLowerCase() === adminEmail);

        // Determine tenant ID
        let targetTenantId: string = options.tenantId || existingAdmin?.tenantId || 'condstore-admin-tenant';

        if (!options.tenantId && !existingAdmin?.tenantId) {
            const existingTenants = await tx.select({ id: tenants.id }).from(tenants).limit(1);
            if (existingTenants.length > 0 && existingTenants[0].id) {
                targetTenantId = existingTenants[0].id;
            } else {
                targetTenantId = 'condstore-admin-tenant';
                await tx.insert(tenants).values({
                    id: targetTenantId,
                    name: 'Condstore OS Admin',
                    twilioNumber: 'whatsapp:+5511999999999',
                });
            }
        } else {
            // Ensure target tenant exists
            const tenantCheck = await tx.select({ id: tenants.id }).from(tenants).where(eq(tenants.id, targetTenantId));
            if (tenantCheck.length === 0) {
                await tx.insert(tenants).values({
                    id: targetTenantId,
                    name: 'Condstore OS Admin',
                    twilioNumber: 'whatsapp:+5511999999999',
                });
            }
        }

        // 2. Ensure signup policy permits admin email
        const policy = await tx.select().from(tenantSignupPolicies).where(eq(tenantSignupPolicies.tenantId, targetTenantId));
        if (policy.length === 0) {
            await tx.insert(tenantSignupPolicies).values({
                tenantId: targetTenantId,
                selfSignupEnabled: true,
                allowedDomains: [],
                allowedEmails: [adminEmail],
            });
        } else {
            const currentEmails: string[] = Array.isArray(policy[0].allowedEmails) ? policy[0].allowedEmails : [];
            if (!currentEmails.map((e) => e.toLowerCase()).includes(adminEmail)) {
                await tx
                    .update(tenantSignupPolicies)
                    .set({
                        allowedEmails: [...currentEmails, adminEmail],
                    })
                    .where(eq(tenantSignupPolicies.tenantId, targetTenantId));
            }
        }

        // 3. Preserve or create/update the Admin User
        let adminUserId: string;

        if (existingAdmin) {
            adminUserId = existingAdmin.id;
            const updatePayload: Partial<UserRecord> = {
                email: adminEmail,
                role: 'admin',
                tenantId: targetTenantId,
                emailVerifiedAt: existingAdmin.emailVerifiedAt || new Date(),
                sessionVersion: (existingAdmin.sessionVersion || 1) + 1,
            };

            // Only update passwordHash if explicit password was provided or admin lacked password
            if (options.adminPassword || process.env.ADMIN_SEED_PASSWORD || process.env.DEV_ADMIN_PASSWORD || !existingAdmin.passwordHash) {
                updatePayload.passwordHash = hashPassword(adminPassword);
            }

            await tx
                .update(users)
                .set(updatePayload)
                .where(eq(users.id, adminUserId));
        } else {
            adminUserId = randomUUID();
            await tx.insert(users).values({
                id: adminUserId,
                email: adminEmail,
                name: 'Local Admin',
                passwordHash: hashPassword(adminPassword),
                authProvider: 'email',
                tenantId: targetTenantId,
                role: 'admin',
                sessionVersion: 1,
                emailVerifiedAt: new Date(),
            });
        }

        // 4. Identify test users to be removed
        const testUsers = allUsers.filter(
            (u) => u.id !== adminUserId && u.email.toLowerCase() !== adminEmail
        );
        const testUserIds = testUsers.map((u) => u.id);

        let cleanedUiPrefs = 0;
        let cleanedNotifications = 0;
        let cleanedInvites = 0;
        let cleanedCustomerAccounts = 0;

        if (testUserIds.length > 0) {
            // Clean up user_ui_prefs referencing test users
            for (const uid of testUserIds) {
                const res = await tx.delete(userUiPrefs).where(eq(userUiPrefs.userId, uid));
                cleanedUiPrefs += extractAffectedRows(res);
            }

            // Clean up notifications referencing test users
            for (const uid of testUserIds) {
                const res = await tx.delete(notifications).where(eq(notifications.userId, uid));
                cleanedNotifications += extractAffectedRows(res);
            }

            // Clean up customer_accounts referencing test users
            for (const uid of testUserIds) {
                const res = await tx.delete(customerAccounts).where(eq(customerAccounts.userId, uid));
                cleanedCustomerAccounts += extractAffectedRows(res);
            }

            // Clean up invites created by test users or for test user emails
            const testEmails = testUsers.map((u) => u.email.toLowerCase());
            for (const uid of testUserIds) {
                const res = await tx.delete(invites).where(eq(invites.createdBy, uid));
                cleanedInvites += extractAffectedRows(res);
            }
            if (testEmails.length > 0) {
                for (const email of testEmails) {
                    const res = await tx.delete(invites).where(eq(invites.email, email));
                    cleanedInvites += extractAffectedRows(res);
                }
            }

            // Disassociate audit / governance fields referencing test users without deleting logs
            for (const uid of testUserIds) {
                await tx.update(adminAuditLog).set({ userId: null }).where(eq(adminAuditLog.userId, uid));
                await tx.update(governanceTasks).set({ assigneeUserId: null }).where(eq(governanceTasks.assigneeUserId, uid));
                await tx.update(governanceTaskComments).set({ authorUserId: adminUserId }).where(eq(governanceTaskComments.authorUserId, uid));
                await tx.update(governanceTaskEvents).set({ actorUserId: null }).where(eq(governanceTaskEvents.actorUserId, uid));
            }

            // Delete test user rows (which purges session state linked to user IDs)
            for (const uid of testUserIds) {
                await tx.delete(users).where(eq(users.id, uid));
            }
        }

        structuredLogger.info('test_users_reset_complete', {
            eventType: 'user_reset',
            adminUserId,
            adminEmail,
            removedUserCount: testUsers.length,
            targetTenantId,
        });

        return {
            success: true,
            adminUser: {
                id: adminUserId,
                email: adminEmail,
                tenantId: targetTenantId,
                role: 'admin',
            },
            removedUserCount: testUsers.length,
            removedUserIds: testUserIds,
            cleanedRecords: {
                userUiPrefs: cleanedUiPrefs,
                notifications: cleanedNotifications,
                invites: cleanedInvites,
                customerAccounts: cleanedCustomerAccounts,
            },
        };
    });
}
