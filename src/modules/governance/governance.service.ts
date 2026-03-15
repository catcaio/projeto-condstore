export const governanceService = {
    async createTask(tenantId: string, data: any, actorUserId: string, tx?: any) {
        return { id: 'dummy-task-id' };
    },
    async getTaskDetails(tenantId: string, taskId: string) {
        return { 
            id: taskId,
            project_id: 'dummy-project-id',
            list_id: 'dummy-list-id',
            title: 'Dummy Task',
            description: 'This is a mocked parent task for playbook'
        };
    },
    async commentOnTask(tenantId: string, taskId: string, actorUserId: string, body: string, tx?: any) {
        return true;
    },
    async updateTask(tenantId: string, taskId: string, data: any, actorUserId: string, tx?: any) {
        return true;
    }
};
