import { headers } from 'next/headers';
import { PageHeader, ShellContainer } from '@/ui/foundation';
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
        <ShellContainer className="min-h-0 flex-1">
            <PageHeader
                eyebrow="Atendimento"
                title="Caixa de entrada supervisionada"
                description="Atendimento humano via WhatsApp com lista de conversas, painel principal e contexto operacional."
                actions={<Link href="/cockpit" className="text-xs font-medium text-[hsl(var(--ui-accent-blue))] hover:underline">Voltar ao Cockpit</Link>}
            />
            <div className="relative min-h-[42rem] flex-1 overflow-hidden rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg-subtle))] shadow-sm md:h-[calc(100dvh-15rem)]">
                <AtendimentoClient tenantId={tenantId} />
            </div>
        </ShellContainer>
    );
}
