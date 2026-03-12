import { headers } from 'next/headers';
import { SettingsPage } from '@/ui/settings';
import { TimelineFeed } from '@/ui/timeline/timeline-feed';

export const metadata = {
    title: 'Timeline Operacional | CONDSTORE OS',
    description: 'Rastreabilidade e histórico de eventos da plataforma'
};

export default async function TimelinePage() {
    const headersList = await headers();
    const tenantId = headersList.get('x-auth-tenant-id');

    if (!tenantId) {
        return <div className="p-8">Tenant não encontrado.</div>;
    }

    return (
        <SettingsPage
            title="Timeline Operacional"
            description="Acompanhe cronologicamente todos os eventos, integrações, mensagens e movimentações em toda a plataforma."
        >
            <div className="h-[800px] bg-[hsl(var(--ui-bg-subtle))] rounded-xl border border-[hsl(var(--ui-border))] p-4 shadow-inner overflow-hidden">
                <TimelineFeed title="Histórico Global do Tenant" refreshIntervalMs={60000} />
            </div>
        </SettingsPage>
    );
}
