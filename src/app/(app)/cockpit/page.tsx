import { WorkspaceFoundationPage } from '@/modules/workspace/foundation';

export const metadata = {
    title: 'Cockpit — CONDSTORE OS',
};

export const dynamic = 'force-dynamic';

export default function CockpitPage() {
    return <WorkspaceFoundationPage moduleId="cockpit" />;
}
