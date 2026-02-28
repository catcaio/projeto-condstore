import { Metadata } from 'next';
import { getServerSessionUser } from '@/infra/auth/session';
import { KnowledgeSourcesClient } from './_components/KnowledgeSourcesClient';

export const metadata: Metadata = {
    title: 'Knowledge Sources',
    description: 'Gestão de fontes de conhecimento para a IA do tenant',
};

export default async function KnowledgeSourcesPage() {
    const session = await getServerSessionUser();
    if (!session || session.role !== 'admin') {
        return <div className="p-8 text-center text-red-500">Acesso negado. Carga administrativa requerida.</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-500 text-[hsl(var(--ui-text))]">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Base de Conhecimento</h1>
                <p className="text-sm text-[hsl(var(--ui-text-muted))] mt-1">
                    Governância sobre Q&A estruturados, políticas, manuais e web scraping preparatórios.
                </p>
            </div>

            <KnowledgeSourcesClient tenantId={session.tenantId} />
        </div>
    );
}
