import { getServerSessionUser } from '@/infra/auth/session';
import { playbookService } from '@/modules/playbooks/playbook.service';
import { GovernanceShell } from '@/modules/governance';
import { PlaybookEditor } from '@/modules/playbooks';
import { notFound } from 'next/navigation';

export default async function EditPlaybookPage(context: any) {
    const session = await getServerSessionUser();
    if (!session || !session.tenantId) return null;
    
    try {
        const playbook = await playbookService.getPlaybook(session.tenantId, (await context.params).id);
        
        return (
            <GovernanceShell title={`Edit: ${playbook.title}`}>
                <PlaybookEditor initialData={playbook} />
            </GovernanceShell>
        );
    } catch (err) {
        notFound();
    }
}
