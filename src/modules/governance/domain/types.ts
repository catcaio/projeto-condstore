export type CreateSpaceDTO = {
    name: string;
    slug?: string;
    color?: string;
    icon?: string;
};

export type UpdateSpaceDTO = Partial<CreateSpaceDTO> & { isArchived?: boolean };

export type CreateProjectDTO = {
    spaceId: string;
    name: string;
    slug?: string;
    description?: string;
    visibility?: 'private' | 'space' | 'public';
};

export type UpdateProjectDTO = Partial<Omit<CreateProjectDTO, 'spaceId'>> & {
    status?: string;
    sortOrder?: number;
    isArchived?: boolean;
};

export type CreateListDTO = {
    projectId: string;
    name: string;
    type?: string;
};

export type UpdateListDTO = Partial<Omit<CreateListDTO, 'projectId'>> & {
    sortOrder?: number;
};

export type CreateTaskDTO = {
    projectId: string;
    listId: string;
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    assigneeUserId?: string;
    dueAt?: Date;
    startAt?: Date;
    sourceType?: string;
    sourceRef?: string;
};

export type UpdateTaskDTO = Partial<Omit<CreateTaskDTO, 'projectId'>> & {
    parentTaskId?: string;
    sortOrder?: number;
    isArchived?: boolean;
};

export type CreateTaskCommentDTO = {
    taskId: string;
    body: string;
};

export type UpdateTaskCommentDTO = {
    body: string;
};

export type CreateTaskEventDTO = {
    taskId: string;
    eventType: string;
    payloadJson: any;
};

export type CreateTaskLinkDTO = {
    taskId: string;
    entityType: string;
    entityId: string;
    label?: string;
};
