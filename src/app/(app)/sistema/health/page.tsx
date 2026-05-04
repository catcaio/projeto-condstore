import { Metadata } from 'next';
import { getServerSessionUser } from '@/infra/auth/session';
import { redirect } from 'next/navigation';
import { CockpitPage } from '@/ui/cockpit/layout/CockpitPage';
import { StatusSettingsClient } from '../../cockpit/status/_components/StatusSettingsClient';

export const metadata: Metadata = {
    title: 'Health — Sistema',
    description: 'Status e resiliência do sistema em tempo real',
};

export default async function SistemaHealthPage() {
    const session = await getServerSessionUser();

    if (!session || session.role !== 'admin' || !session.tenantId) {
        redirect('/login');
    }

    return (
        <CockpitPage
            title="HEALTH & RESILIÊNCIA"
            description="Visão em tempo real da integridade estrutural, modos de incidente e governança de segredos."
        >
            <StatusSettingsClient tenantId={session.tenantId} />
        </CockpitPage>
    );
}
