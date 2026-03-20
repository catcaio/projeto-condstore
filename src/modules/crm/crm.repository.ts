import { and, asc, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { getDb, softDeletePatch, withTenantIdNotDeleted, withTenantNotDeleted } from '@/infra/db';
import {
    crmFollowUps,
    crmNotes,
    crmOpportunities,
    crmQuoteItems,
    crmQuotes,
    crmTasks,
    type CrmFollowUpRecord,
    type CrmNoteRecord,
    type CrmOpportunityRecord,
    type CrmQuoteRecord,
    type CrmTaskRecord,
    type NewCrmFollowUpRecord,
    type NewCrmNoteRecord,
    type NewCrmOpportunityRecord,
    type NewCrmQuoteItemRecord,
    type NewCrmQuoteRecord,
    type NewCrmTaskRecord,
} from '@/drizzle/schema';

type DbExecutor = Awaited<ReturnType<typeof getDb>>;

async function resolveDb(database?: DbExecutor): Promise<DbExecutor> {
    return database ?? await getDb();
}

async function findNoteById(tenantId: string, noteId: string, database?: DbExecutor) {
    const db = await resolveDb(database);
    const [note] = await db.select()
        .from(crmNotes)
        .where(withTenantIdNotDeleted(crmNotes, tenantId, noteId))
        .limit(1);

    return note;
}

async function findTaskById(tenantId: string, taskId: string, database?: DbExecutor) {
    const db = await resolveDb(database);
    const [task] = await db.select()
        .from(crmTasks)
        .where(withTenantIdNotDeleted(crmTasks, tenantId, taskId))
        .limit(1);

    return task;
}

async function findOpportunityById(tenantId: string, opportunityId: string, database?: DbExecutor) {
    const db = await resolveDb(database);
    const [opportunity] = await db.select()
        .from(crmOpportunities)
        .where(withTenantIdNotDeleted(crmOpportunities, tenantId, opportunityId))
        .limit(1);

    return opportunity;
}

async function findQuoteById(tenantId: string, quoteId: string, database?: DbExecutor) {
    const db = await resolveDb(database);
    const [quote] = await db.select()
        .from(crmQuotes)
        .where(withTenantIdNotDeleted(crmQuotes, tenantId, quoteId))
        .limit(1);

    return quote;
}

export const crmRepository = {
    async listNotesByCustomer(
        tenantId: string,
        customerId: string,
        limit?: number,
        database?: DbExecutor,
    ): Promise<CrmNoteRecord[]> {
        const db = await resolveDb(database);
        const query = db.select()
            .from(crmNotes)
            .where(withTenantNotDeleted(crmNotes, tenantId, eq(crmNotes.customerId, customerId)))
            .orderBy(desc(crmNotes.createdAt));

        return limit ? query.limit(limit) : query;
    },

    findNoteById,

    async createNote(data: NewCrmNoteRecord, database?: DbExecutor): Promise<CrmNoteRecord | undefined> {
        const db = await resolveDb(database);
        await db.insert(crmNotes).values(data);
        return findNoteById(data.tenantId, data.id, db);
    },

    async softDeleteNote(tenantId: string, noteId: string, database?: DbExecutor): Promise<void> {
        const db = await resolveDb(database);
        await db.update(crmNotes)
            .set(softDeletePatch())
            .where(withTenantIdNotDeleted(crmNotes, tenantId, noteId));
    },

    async listTasksByCustomer(
        tenantId: string,
        customerId: string,
        options: { limit?: number; openOnly?: boolean } = {},
        database?: DbExecutor,
    ): Promise<CrmTaskRecord[]> {
        const db = await resolveDb(database);
        const openOnlyCondition = options.openOnly
            ? or(eq(crmTasks.status, 'OPEN'), isNull(crmTasks.status))
            : undefined;

        const query = db.select()
            .from(crmTasks)
            .where(withTenantNotDeleted(crmTasks, tenantId, eq(crmTasks.customerId, customerId), openOnlyCondition))
            .orderBy(desc(crmTasks.createdAt));

        return options.limit ? query.limit(options.limit) : query;
    },

    findTaskById,

    async createTask(data: NewCrmTaskRecord, database?: DbExecutor): Promise<CrmTaskRecord | undefined> {
        const db = await resolveDb(database);
        await db.insert(crmTasks).values(data);
        return findTaskById(data.tenantId, data.id, db);
    },

    async updateTaskStatus(
        tenantId: string,
        taskId: string,
        status: string,
        database?: DbExecutor,
    ): Promise<CrmTaskRecord | undefined> {
        const db = await resolveDb(database);
        await db.update(crmTasks)
            .set({ status, updatedAt: new Date() })
            .where(withTenantIdNotDeleted(crmTasks, tenantId, taskId));

        return findTaskById(tenantId, taskId, db);
    },

    async softDeleteTask(tenantId: string, taskId: string, database?: DbExecutor): Promise<void> {
        const db = await resolveDb(database);
        await db.update(crmTasks)
            .set({ ...softDeletePatch(), updatedAt: new Date() })
            .where(withTenantIdNotDeleted(crmTasks, tenantId, taskId));
    },

    async findActiveOpportunity(
        tenantId: string,
        customerId: string,
        database?: DbExecutor,
    ): Promise<CrmOpportunityRecord | null> {
        const db = await resolveDb(database);
        const [opportunity] = await db.select()
            .from(crmOpportunities)
            .where(
                withTenantNotDeleted(
                    crmOpportunities,
                    tenantId,
                    eq(crmOpportunities.customerId, customerId),
                    eq(crmOpportunities.status, 'active'),
                ),
            )
            .limit(1);

        return opportunity ?? null;
    },

    findOpportunityById,

    async listRecentOpportunities(
        tenantId: string,
        limit = 5,
        database?: DbExecutor,
    ): Promise<CrmOpportunityRecord[]> {
        const db = await resolveDb(database);
        return db.select()
            .from(crmOpportunities)
            .where(withTenantNotDeleted(crmOpportunities, tenantId))
            .orderBy(desc(crmOpportunities.updatedAt))
            .limit(limit);
    },

    async createOpportunity(
        data: NewCrmOpportunityRecord,
        database?: DbExecutor,
    ): Promise<CrmOpportunityRecord | undefined> {
        const db = await resolveDb(database);
        await db.insert(crmOpportunities).values(data);
        return findOpportunityById(data.tenantId, data.id, db);
    },

    async updateOpportunity(
        tenantId: string,
        opportunityId: string,
        data: Partial<NewCrmOpportunityRecord>,
        database?: DbExecutor,
    ): Promise<void> {
        const db = await resolveDb(database);
        await db.update(crmOpportunities)
            .set(data)
            .where(withTenantIdNotDeleted(crmOpportunities, tenantId, opportunityId));
    },

    async softDeleteOpportunity(tenantId: string, opportunityId: string, database?: DbExecutor): Promise<void> {
        const db = await resolveDb(database);
        await db.update(crmOpportunities)
            .set({ ...softDeletePatch(), updatedAt: new Date() })
            .where(withTenantIdNotDeleted(crmOpportunities, tenantId, opportunityId));
    },

    findQuoteById,

    async createQuote(data: NewCrmQuoteRecord, database?: DbExecutor): Promise<CrmQuoteRecord | undefined> {
        const db = await resolveDb(database);
        await db.insert(crmQuotes).values(data);
        return findQuoteById(data.tenantId, data.id, db);
    },

    async updateQuote(
        tenantId: string,
        quoteId: string,
        data: Partial<NewCrmQuoteRecord>,
        database?: DbExecutor,
    ): Promise<void> {
        const db = await resolveDb(database);
        await db.update(crmQuotes)
            .set(data)
            .where(withTenantIdNotDeleted(crmQuotes, tenantId, quoteId));
    },

    async softDeleteQuote(tenantId: string, quoteId: string, database?: DbExecutor): Promise<void> {
        const db = await resolveDb(database);
        await db.update(crmQuotes)
            .set({ ...softDeletePatch(), updatedAt: new Date() })
            .where(withTenantIdNotDeleted(crmQuotes, tenantId, quoteId));
    },

    async replaceQuoteItems(
        tenantId: string,
        quoteId: string,
        items: NewCrmQuoteItemRecord[],
        database?: DbExecutor,
    ): Promise<void> {
        const db = await resolveDb(database);
        const existingItems = await db.select({ id: crmQuoteItems.id })
            .from(crmQuoteItems)
            .where(withTenantNotDeleted(crmQuoteItems, tenantId, eq(crmQuoteItems.quoteId, quoteId)));

        if (existingItems.length > 0) {
            await db.update(crmQuoteItems)
                .set(softDeletePatch())
                .where(
                    withTenantNotDeleted(
                        crmQuoteItems,
                        tenantId,
                        inArray(crmQuoteItems.id, existingItems.map((item) => item.id)),
                    ),
                );
        }

        if (items.length > 0) {
            await db.insert(crmQuoteItems).values(items);
        }
    },

    async listPendingFollowUps(
        tenantId: string,
        limit = 3,
        database?: DbExecutor,
    ): Promise<CrmFollowUpRecord[]> {
        const db = await resolveDb(database);
        return db.select()
            .from(crmFollowUps)
            .where(
                withTenantNotDeleted(
                    crmFollowUps,
                    tenantId,
                    eq(crmFollowUps.status, 'pending'),
                ),
            )
            .orderBy(asc(crmFollowUps.scheduledAt))
            .limit(limit);
    },

    async createFollowUp(data: NewCrmFollowUpRecord, database?: DbExecutor): Promise<void> {
        const db = await resolveDb(database);
        await db.insert(crmFollowUps).values(data);
    },

    async softDeleteFollowUp(tenantId: string, followUpId: string, database?: DbExecutor): Promise<void> {
        const db = await resolveDb(database);
        await db.update(crmFollowUps)
            .set(softDeletePatch())
            .where(withTenantIdNotDeleted(crmFollowUps, tenantId, followUpId));
    },
};
