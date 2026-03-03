import { getServerSessionUser } from '@/infra/auth/session';
import { makeRequestId } from '@/infra/http/request-trace';
import { redirect } from 'next/navigation';
import { CockpitPage } from '@/ui/cockpit/layout/CockpitPage';
import { StatusSettingsClient } from './_components/StatusSettingsClient';

export const metadata = {
    title: 'Status e Resiliência | Cockpit',
};

export default async function StatusPage({ params }: { params: { tenantId?: string } }) {
    const session = await getServerSessionUser();

    if (!session || session.role !== 'admin' || !session.tenantId) {
        redirect('/auth/login');
    }

    return (
        <CockpitPage
            title="STATUS & RESILIÊNCIA"
            description="Visão em tempo real da integridade estrutural, modos de incidente e governança de segredos."
        >
            <StatusSettingsClient tenantId={session.tenantId} />
        </CockpitPage>
    );
}
