import { PlaybooksRepository, playbooksRepository } from './playbooks.repository';
import { CreatePlaybookDTO, UpdatePlaybookDTO, PlaybookDefinition, PlaybookEntity } from './playbooks.types';
import { emitPlaybookCreated, emitPlaybookUpdated, emitPlaybookExecuted } from './playbooks.events';

export class PlaybooksService {
    constructor(private readonly repo: PlaybooksRepository = playbooksRepository) {}

    async createPlaybook(tenantId: string, data: CreatePlaybookDTO, operatorId?: string): Promise<PlaybookDefinition> {
        const playbook = await this.repo.create(tenantId, data, operatorId);
        await emitPlaybookCreated({ tenantId, playbookId: playbook.id, playbookName: playbook.name, operatorId });
        return playbook;
    }

    async updatePlaybook(tenantId: string, id: string, data: UpdatePlaybookDTO, operatorId?: string): Promise<PlaybookDefinition> {
        const existing = await this.repo.findById(tenantId, id);
        if (!existing) {
            throw new Error(`Playbook not found: ${id}`);
        }

        const playbook = await this.repo.update(tenantId, id, data, existing.version);
        if (!playbook) throw new Error('Failed to update playbook');

        await emitPlaybookUpdated({ tenantId, playbookId: playbook.id, playbookName: playbook.name, operatorId });
        return playbook;
    }

    async deletePlaybook(tenantId: string, id: string): Promise<void> {
        const existing = await this.repo.findById(tenantId, id);
        if (!existing) {
            throw new Error(`Playbook not found: ${id}`);
        }
        await this.repo.delete(tenantId, id);
    }

    async getPlaybook(tenantId: string, id: string): Promise<PlaybookDefinition | null> {
        return this.repo.findById(tenantId, id);
    }

    async listPlaybooks(tenantId: string, entity?: PlaybookEntity): Promise<PlaybookDefinition[]> {
        return this.repo.listByTenant(tenantId, entity);
    }

    async recordExecution(tenantId: string, playbookId: string, entityId: string, contextId?: string, operatorId?: string) {
        await emitPlaybookExecuted({ tenantId, playbookId, entityId, contextId, operatorId });
    }
}

export const playbooksService = new PlaybooksService();
