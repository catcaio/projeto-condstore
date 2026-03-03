import { Metadata } from 'next';
import { getServerSessionUser } from '@/infra/auth/session';
import { CockpitPage } from '@/ui/cockpit/layout/CockpitPage';
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
        <CockpitPage
            title="KNOWLEDGE BASE"
            description="Governância sobre Q&A estruturados, políticas, manuais e web scraping preparatórios."
        >
            <KnowledgeSourcesClient tenantId={session.tenantId} />
        </CockpitPage>
    );
}
