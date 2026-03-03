import { getServerSessionUser } from '@/infra/auth/session';
import { makeRequestId } from '@/infra/http/request-trace';
import { redirect } from 'next/navigation';
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
        <div className="mx-auto max-w-4xl p-6 space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                    <span>Central de Controle Operacional</span>
                </h1>
                <p className="text-zinc-400">
                    Visão em tempo real da integridade estrutural, modos de incidente e governança de segredos.
                </p>
            </div>

            <StatusSettingsClient tenantId={session.tenantId} />
        </div>
    );
}
