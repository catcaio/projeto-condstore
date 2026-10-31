import { headers } from 'next/headers';
import { PageHeader, ShellContainer } from '@/ui/foundation';
import AtendimentoClient from './atendimento.client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
    title: 'Atendimento Supervisionado | CONDSTORE OS',
    description: 'Central de Atendimento Humano supervisionado com contexto comercial e operacional.'
};

export default async function AtendimentoPage() {
    const headersList = await headers();
    const tenantId = headersList.get('x-auth-tenant-id');

    if (!tenantId) {
        return (
            <div className="p-6 text-xs font-semibold text-[hsl(var(--ui-text-muted))] bg-[hsl(var(--ui-page))] min-h-screen flex items-center justify-center">
                Sessão/Tenant ID não encontrado.
            </div>
        );
    }

    return (
        <ShellContainer className="min-h-0 flex-1 flex flex-col gap-3 md:gap-4 p-2 sm:p-4 lg:p-6">
            <PageHeader
                eyebrow="Operação Comercial • CONDSTORE OS"
                title="Atendimento Supervisionado no WhatsApp"
                description="Conversas centralizadas, histórico de negociações, cotação de frete e emissão de pedidos sem perder o contexto."
                actions={
                    <Link
                        href="/cockpit"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--ui-text))] hover:underline underline-offset-4"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Voltar ao Cockpit</span>
                    </Link>
                }
            />
            <div className="relative flex-1 min-h-[500px] h-[calc(100dvh-16rem)] min-h-0 overflow-hidden rounded-2xl border border-[hsl(var(--ui-border)/0.6)] bg-[hsl(var(--ui-surface))] shadow-sm">
                <AtendimentoClient tenantId={tenantId} />
            </div>
        </ShellContainer>
    );
}
