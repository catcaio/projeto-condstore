import { db } from '@/db/client';
import { eq, and, desc, asc, isNull } from 'drizzle-orm';
import {
    governanceSpaces,
    governanceProjects,
    governanceLists,
    governanceTasks,
    governanceTaskComments,
    governanceTaskEvents,
    governanceTaskLinks
} from '@/drizzle/schema';
import { randomUUID } from 'node:crypto';

// --- Spaces ---
export async function createSpace(tenantId: string, data: typeof governanceSpaces.$inferInsert) {
    await db.insert(governanceSpaces).values(data);
    return data;
}

export async function updateSpace(tenantId: string, spaceId: string, data: Partial<typeof governanceSpaces.$inferInsert>) {
    await db.update(governanceSpaces)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(governanceSpaces.id, spaceId), eq(governanceSpaces.tenantId, tenantId)));
}

export async function getSpace(tenantId: string, spaceId: string) {
    const res = await db.select().from(governanceSpaces).where(and(eq(governanceSpaces.id, spaceId), eq(governanceSpaces.tenantId, tenantId), isNull(governanceSpaces.archivedAt))).limit(1);
    return res[0] ?? null;
}

export async function getSpaceBySlug(tenantId: string, slug: string) {
    const res = await db.select().from(governanceSpaces).where(and(eq(governanceSpaces.slug, slug), eq(governanceSpaces.tenantId, tenantId), isNull(governanceSpaces.archivedAt))).limit(1);
    return res[0] ?? null;
}

export async function listSpaces(tenantId: string) {
    return db.select().from(governanceSpaces)
        .where(and(eq(governanceSpaces.tenantId, tenantId), isNull(governanceSpaces.archivedAt)))
        .orderBy(desc(governanceSpaces.createdAt));
}

// --- Projects ---
export async function createProject(tenantId: string, data: typeof governanceProjects.$inferInsert) {
    await db.insert(governanceProjects).values(data);
    return data;
}

export async function updateProject(tenantId: string, projectId: string, data: Partial<typeof governanceProjects.$inferInsert>) {
    await db.update(governanceProjects)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(governanceProjects.id, projectId), eq(governanceProjects.tenantId, tenantId)));
}

export async function getProject(tenantId: string, projectId: string) {
    const res = await db.select().from(governanceProjects).where(and(eq(governanceProjects.id, projectId), eq(governanceProjects.tenantId, tenantId), isNull(governanceProjects.archivedAt))).limit(1);
    return res[0] ?? null;
}

export async function getProjectBySlug(tenantId: string, spaceId: string, slug: string) {
    const res = await db.select().from(governanceProjects).where(and(
        eq(governanceProjects.slug, slug),
        eq(governanceProjects.spaceId, spaceId),
        eq(governanceProjects.tenantId, tenantId),
        isNull(governanceProjects.archivedAt)
    )).limit(1);
    return res[0] ?? null;
}

export async function listSpaceProjects(tenantId: string, spaceId: string) {
    return db.select().from(governanceProjects)
        .where(and(eq(governanceProjects.tenantId, tenantId), eq(governanceProjects.spaceId, spaceId), isNull(governanceProjects.archivedAt)))
        .orderBy(asc(governanceProjects.sortOrder), desc(governanceProjects.createdAt));
}

// --- Lists ---
export async function createList(tenantId: string, data: typeof governanceLists.$inferInsert) {
    await db.insert(governanceLists).values(data);
    return data;
}

export async function updateList(tenantId: string, listId: string, data: Partial<typeof governanceLists.$inferInsert>) {
    await db.update(governanceLists)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(governanceLists.id, listId), eq(governanceLists.tenantId, tenantId)));
}

export async function listProjectLists(tenantId: string, projectId: string) {
    return db.select().from(governanceLists)
        .where(and(eq(governanceLists.tenantId, tenantId), eq(governanceLists.projectId, projectId)))
        .orderBy(asc(governanceLists.sortOrder), desc(governanceLists.createdAt));
}

// --- Tasks ---
export async function createTask(tenantId: string, data: typeof governanceTasks.$inferInsert) {
    await db.insert(governanceTasks).values(data);
    return data;
}

export async function updateTask(tenantId: string, taskId: string, data: Partial<typeof governanceTasks.$inferInsert>) {
    await db.update(governanceTasks)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(governanceTasks.id, taskId), eq(governanceTasks.tenantId, tenantId)));
}

export async function getTask(tenantId: string, taskId: string) {
    const res = await db.select().from(governanceTasks).where(and(eq(governanceTasks.id, taskId), eq(governanceTasks.tenantId, tenantId), isNull(governanceTasks.archivedAt))).limit(1);
    return res[0] ?? null;
}

export async function listProjectTasks(tenantId: string, projectId: string) {
    return db.select().from(governanceTasks)
        .where(and(eq(governanceTasks.tenantId, tenantId), eq(governanceTasks.projectId, projectId), isNull(governanceTasks.archivedAt)))
        .orderBy(asc(governanceTasks.sortOrder), desc(governanceTasks.createdAt));
}

// --- Comments ---
export async function createTaskComment(tenantId: string, data: typeof governanceTaskComments.$inferInsert) {
    await db.insert(governanceTaskComments).values(data);
    return data;
}

export async function listTaskComments(tenantId: string, taskId: string) {
    return db.select().from(governanceTaskComments)
        .where(and(eq(governanceTaskComments.tenantId, tenantId), eq(governanceTaskComments.taskId, taskId), isNull(governanceTaskComments.deletedAt)))
        .orderBy(asc(governanceTaskComments.createdAt));
}

// --- Events ---
export async function createTaskEvent(tenantId: string, data: typeof governanceTaskEvents.$inferInsert) {
    await db.insert(governanceTaskEvents).values(data);
    return data;
}

export async function listTaskEvents(tenantId: string, taskId: string) {
    return db.select().from(governanceTaskEvents)
        .where(and(eq(governanceTaskEvents.tenantId, tenantId), eq(governanceTaskEvents.taskId, taskId)))
        .orderBy(desc(governanceTaskEvents.createdAt));
}

// --- Links ---
export async function createTaskLink(tenantId: string, data: typeof governanceTaskLinks.$inferInsert) {
    await db.insert(governanceTaskLinks).values(data);
    return data;
}

export async function listTaskLinks(tenantId: string, taskId: string) {
    return db.select().from(governanceTaskLinks)
        .where(and(eq(governanceTaskLinks.tenantId, tenantId), eq(governanceTaskLinks.taskId, taskId)))
        .orderBy(desc(governanceTaskLinks.createdAt));
}
