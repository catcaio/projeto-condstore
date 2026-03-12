import { headers } from 'next/headers';
import { SettingsPage } from '@/ui/settings';
import AtendimentoClient from './atendimento.client';
import Link from 'next/link';

export const metadata = {
    title: 'Atendimento | CONDSTORE OS',
    description: 'Central de Atendimento Humano'
};

export default async function AtendimentoPage() {
    const headersList = await headers();
    const tenantId = headersList.get('x-auth-tenant-id');

    if (!tenantId) {
        return <div className="p-8">Tenant não encontrado.</div>;
    }

    return (
        <SettingsPage
            title="Atendimento"
            description="Caixa de entrada para atendimento humano aos clientes via WhatsApp"
            headerAction={<Link href="/cockpit" className="text-xs text-[hsl(var(--ui-accent-blue))] font-medium hover:underline flex items-center gap-1">&larr; Voltar ao Launcher</Link>}
        >
            <div className="bg-[hsl(var(--ui-bg-subtle))] border border-[hsl(var(--ui-border))] rounded-xl overflow-hidden shadow-sm pt-0 h-[700px]">
                <AtendimentoClient tenantId={tenantId} />
            </div>
        </SettingsPage>
    );
}
