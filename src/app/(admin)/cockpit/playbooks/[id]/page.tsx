import { requireSession } from '@/infra/auth/guards';
import { playbookService } from '@/modules/playbooks/playbook.service';
import { GovernanceShell } from '@/modules/governance/components/governance-shell';
import { PlaybookEditor } from '@/modules/playbooks/components/playbook-editor';
import { notFound } from 'next/navigation';

export default async function EditPlaybookPage(context: any) {
    const sessionRes = await requireSession(undefined as any);
    if (!sessionRes.ok) return null;
    const ctx = sessionRes.session as any;
    
    try {
        const playbook = await playbookService.getPlaybook(ctx.tenantId, (await context.params).id);
        
        return (
            <GovernanceShell title={`Edit: ${playbook.title}`}>
                <PlaybookEditor initialData={playbook} />
            </GovernanceShell>
        );
    } catch (err) {
        notFound();
    }
}
