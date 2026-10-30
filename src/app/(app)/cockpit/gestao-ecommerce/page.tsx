import { redirect } from 'next/navigation';
import { getServerSessionUser } from '@/infra/auth/session';
import { isRole } from '@/infra/auth/roles';
import { EmptyState } from '@/ui/foundation';
import { getEcommerceCockpit } from '@/modules/cockpit/gestao-ecommerce/server';
import { ECOMMERCE_FRONTS, type EcommerceFrontCode } from '@/modules/cockpit/gestao-ecommerce/types';
import { EcommerceCockpitView } from '@/modules/cockpit/gestao-ecommerce/components/CockpitView';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Gestão de E-commerce — CONDSTORE OS' };

export default async function EcommerceCockpitPage({ searchParams }: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const session = await getServerSessionUser();
    if (!session?.sub || !session.tenantId) redirect('/login');
    if (!isRole(session.role)) return <EmptyState title="Sem permissão" description="Sua sessão não possui um perfil autorizado para consultar a gestão de e-commerce." />;

    const params = await searchParams;
    const frontCode = params.frontCode;
    const projectId = params.projectId;
    if ((frontCode !== undefined && (typeof frontCode !== 'string' || !ECOMMERCE_FRONTS.some(front => front.code === frontCode)))
        || (projectId !== undefined && (typeof projectId !== 'string' || !projectId.trim() || projectId.length > 36))) {
        return <EmptyState title="Filtro inválido" description="Selecione uma frente ou projeto pelos links do cockpit." />;
    }
    const filters = { frontCode: frontCode as EcommerceFrontCode | undefined, projectId: projectId as string | undefined };
    const snapshot = await getEcommerceCockpit({ tenantId: session.tenantId, userId: session.sub, role: session.role }, filters);
    return <EcommerceCockpitView snapshot={snapshot} filters={filters} />;
}
