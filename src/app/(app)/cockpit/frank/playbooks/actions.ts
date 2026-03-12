'use server';

import { 
    createPlaybook, 
    updatePlaybook, 
    listPlaybooks, 
    archivePlaybook,
    type CreatePlaybookDto,
    type UpdatePlaybookDto
} from '@/modules/frank/playbooks/playbook.repository';
import { getServerSessionUser } from '@/infra/auth/session';

export async function getPlaybooksAction() {
    const session = await getServerSessionUser();
    if (!session?.tenantId) throw new Error('Tenant required');
    return listPlaybooks(session.tenantId);
}

export async function createPlaybookAction(data: Omit<CreatePlaybookDto, 'tenantId'>) {
    const session = await getServerSessionUser();
    if (!session?.tenantId) throw new Error('Tenant required');
    
    await createPlaybook({
        ...data,
        tenantId: session.tenantId,
    });
}

export async function updatePlaybookAction(data: Omit<UpdatePlaybookDto, 'tenantId'>) {
    const session = await getServerSessionUser();
    if (!session?.tenantId) throw new Error('Tenant required');
    
    await updatePlaybook({
        ...data,
        tenantId: session.tenantId,
    });
}

export async function archivePlaybookAction(id: string) {
    const session = await getServerSessionUser();
    if (!session?.tenantId) throw new Error('Tenant required');
    
    await archivePlaybook(session.tenantId, id);
}
