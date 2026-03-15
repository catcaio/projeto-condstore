import { GovernanceShell } from '@/modules/governance/components/governance-shell';
import { PlaybookEditor } from '@/modules/playbooks/components/playbook-editor';

export default function NewPlaybookPage() {
    return (
        <GovernanceShell title="Create Playbook">
            <PlaybookEditor />
        </GovernanceShell>
    );
}
