import * as repo from '../repositories/governance.repository';
import * as types from '../domain/types';
import { randomUUID } from 'node:crypto';

export interface ActionContext {
    tenantId: string;
    actorUserId: string;
    role?: string;
}

function generateSlug(text: string) {
    return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function createSpace(ctx: ActionContext, dto: types.CreateSpaceDTO) {
    const id = randomUUID();
    const slug = dto.slug || generateSlug(dto.name);
    return repo.createSpace(ctx.tenantId, {
        id,
        tenantId: ctx.tenantId,
        name: dto.name,
        slug,
        color: dto.color,
        icon: dto.icon,
    });
}

export async function createProject(ctx: ActionContext, dto: types.CreateProjectDTO) {
    const space = await repo.getSpace(ctx.tenantId, dto.spaceId);
    if (!space) throw new Error('Space not found');
    
    const id = randomUUID();
    const slug = dto.slug || generateSlug(dto.name);
    return repo.createProject(ctx.tenantId, {
        id,
        tenantId: ctx.tenantId,
        spaceId: dto.spaceId,
        name: dto.name,
        slug,
        description: dto.description,
        visibility: dto.visibility || 'private',
        createdBy: ctx.actorUserId,
    });
}

export async function createList(ctx: ActionContext, dto: types.CreateListDTO) {
    const project = await repo.getProject(ctx.tenantId, dto.projectId);
    if (!project) throw new Error('Project not found');
    
    const id = randomUUID();
    return repo.createList(ctx.tenantId, {
        id,
        tenantId: ctx.tenantId,
        projectId: dto.projectId,
        name: dto.name,
        type: dto.type || 'todo',
    });
}

export async function createTask(ctx: ActionContext, dto: types.CreateTaskDTO) {
    const id = randomUUID();
    const task = await repo.createTask(ctx.tenantId, {
        id,
        tenantId: ctx.tenantId,
        projectId: dto.projectId,
        listId: dto.listId,
        title: dto.title,
        description: dto.description,
        status: dto.status || 'open',
        priority: dto.priority || 'normal',
        assigneeUserId: dto.assigneeUserId,
        reporterUserId: ctx.actorUserId,
        dueAt: dto.dueAt,
        startAt: dto.startAt,
        sourceType: dto.sourceType || 'manual',
        sourceRef: dto.sourceRef,
    });
    
    await repo.createTaskEvent(ctx.tenantId, {
        id: randomUUID(),
        tenantId: ctx.tenantId,
        taskId: id,
        actorUserId: ctx.actorUserId,
        eventType: 'task_created',
        payloadJson: { source: dto.sourceType },
    });
    
    return task;
}

export async function updateTask(ctx: ActionContext, taskId: string, dto: types.UpdateTaskDTO) {
    const existing = await repo.getTask(ctx.tenantId, taskId);
    if (!existing) throw new Error('Task not found');
    
    await repo.updateTask(ctx.tenantId, taskId, dto);
    
    const changes: any = {};
    if (dto.status && dto.status !== existing.status) changes.status = dto.status;
    if (dto.priority && dto.priority !== existing.priority) changes.priority = dto.priority;
    if (dto.dueAt !== undefined) changes.dueAt = dto.dueAt;
    
    if (Object.keys(changes).length > 0) {
        await repo.createTaskEvent(ctx.tenantId, {
            id: randomUUID(),
            tenantId: ctx.tenantId,
            taskId,
            actorUserId: ctx.actorUserId,
            eventType: 'task_updated',
            payloadJson: changes,
        });
    }
}

export async function moveTask(ctx: ActionContext, taskId: string, targetListId: string, sortOrder?: number) {
    await repo.updateTask(ctx.tenantId, taskId, { listId: targetListId, sortOrder });
    await repo.createTaskEvent(ctx.tenantId, {
        id: randomUUID(),
        tenantId: ctx.tenantId,
        taskId,
        actorUserId: ctx.actorUserId,
        eventType: 'task_moved',
        payloadJson: { targetListId, sortOrder },
    });
}

export async function assignTask(ctx: ActionContext, taskId: string, assigneeUserId: string | null) {
    await repo.updateTask(ctx.tenantId, taskId, { assigneeUserId });
    await repo.createTaskEvent(ctx.tenantId, {
        id: randomUUID(),
        tenantId: ctx.tenantId,
        taskId,
        actorUserId: ctx.actorUserId,
        eventType: 'task_assigned',
        payloadJson: { assigneeUserId },
    });
}

export async function commentTask(ctx: ActionContext, taskId: string, body: string) {
    const id = randomUUID();
    const comment = await repo.createTaskComment(ctx.tenantId, {
        id,
        tenantId: ctx.tenantId,
        taskId,
        authorUserId: ctx.actorUserId,
        body,
    });
    
    await repo.createTaskEvent(ctx.tenantId, {
        id: randomUUID(),
        tenantId: ctx.tenantId,
        taskId,
        actorUserId: ctx.actorUserId,
        eventType: 'task_commented',
        payloadJson: { commentId: id },
    });
    
    return comment;
}

export async function linkTaskEntity(ctx: ActionContext, taskId: string, entityType: string, entityId: string, label?: string) {
    const id = randomUUID();
    const link = await repo.createTaskLink(ctx.tenantId, {
        id,
        tenantId: ctx.tenantId,
        taskId,
        entityType,
        entityId,
        label,
    });
    
    await repo.createTaskEvent(ctx.tenantId, {
        id: randomUUID(),
        tenantId: ctx.tenantId,
        taskId,
        actorUserId: ctx.actorUserId,
        eventType: 'task_linked',
        payloadJson: { entityType, entityId },
    });
    
    return link;
}

export async function getTaskDetail(ctx: ActionContext, taskId: string) {
    const task = await repo.getTask(ctx.tenantId, taskId);
    if (!task) return null;
    
    const [comments, events, links] = await Promise.all([
        repo.listTaskComments(ctx.tenantId, taskId),
        repo.listTaskEvents(ctx.tenantId, taskId),
        repo.listTaskLinks(ctx.tenantId, taskId)
    ]);
    
    return { ...task, comments, events, links };
}

export async function listProjectTasks(ctx: ActionContext, projectId: string) {
    return repo.listProjectTasks(ctx.tenantId, projectId);
}

export async function listProjectBoard(ctx: ActionContext, projectId: string) {
    const lists = await repo.listProjectLists(ctx.tenantId, projectId);
    const tasks = await repo.listProjectTasks(ctx.tenantId, projectId);
    
    return lists.map(list => ({
        ...list,
        tasks: tasks.filter(t => t.listId === list.id)
    }));
}
