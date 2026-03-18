import { GovernanceShell } from '@/modules/governance';
import { PlaybookEditor } from '@/modules/playbooks';

export const dynamic = 'force-dynamic';

export default function NewPlaybookPage() {
    return (
        <GovernanceShell title="Create Playbook">
            <PlaybookEditor />
        </GovernanceShell>
    );
}
