import { db } from '@/db/client';
import { playbookRepository } from './playbook.repository';
import { governanceService } from '../governance/governance.service';
import { CreatePlaybookDTO, ApplyPlaybookDTO } from './playbook.types';

export class PlaybookService {
    
    async createPlaybook(data: CreatePlaybookDTO) {
        return db.transaction(async (tx) => {
            return await playbookRepository.create(data, tx);
        });
    }

    async listPlaybooks(tenantId: string) {
        return await playbookRepository.listByTenant(tenantId);
    }
    
    async getPlaybook(tenantId: string, playbookId: string) {
        const pb = await playbookRepository.findById(tenantId, playbookId);
        if (!pb) throw new Error('Playbook not found');
        return pb;
    }

    async getPlaybooksForTrigger(tenantId: string, triggerType: string) {
        return await playbookRepository.findByTrigger(tenantId, triggerType);
    }

    async applyPlaybook(data: ApplyPlaybookDTO) {
        return db.transaction(async (tx) => {
            const playbook = await playbookRepository.findById(data.tenantId, data.playbookId, tx);
            if (!playbook) throw new Error('Playbook not found');

            const parentTask = await governanceService.getTaskDetails(data.tenantId, data.parentTaskId);
            if (!parentTask) throw new Error('Parent task not found');

            const createdTasks = [];

            // Emit single task logic for each step
            for (const step of playbook.steps) {
                const subtask = await governanceService.createTask(
                    data.tenantId, 
                    {
                        projectId: parentTask.project_id,
                        listId: parentTask.list_id,
                        parentTaskId: data.parentTaskId,
                        title: step.title,
                        description: step.description || `Generated from Playbook: ${playbook.title}`,
                        priority: 'normal',
                        sourceType: 'system',
                        sourceRef: `playbook_${playbook.id}_step_${step.id}`,
                    },
                    data.actorUserId,
                    tx
                );
                createdTasks.push(subtask);

                // Re-wire auto assignments or automations derived from actionConfig here if necessary.
                if ((step.actionConfig as any)?.autoAssignTo) {
                    await governanceService.updateTask(data.tenantId, subtask.id, {
                        assigneeUserId: (step.actionConfig as any)?.autoAssignTo
                    }, data.actorUserId, tx);
                }
            }
            
            // Add comment on parent indicating playbook ran
            await governanceService.commentOnTask(
                data.tenantId,
                data.parentTaskId,
                data.actorUserId,
                `💡 **Playbook Applied:** ${playbook.title}\n${playbook.steps.length} sub-tasks have been automatically generated.`,
                tx
            );

            return {
                playbook,
                createdTasksCount: createdTasks.length
            };
        });
    }
}

export const playbookService = new PlaybookService();
