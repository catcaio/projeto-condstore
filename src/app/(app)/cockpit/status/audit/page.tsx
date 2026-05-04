import { getServerSessionUser } from '@/infra/auth/session';
import { redirect } from 'next/navigation';
import { AuditClient } from './_components/AuditClient';

export const metadata = {
    title: 'Audit Log | Cockpit',
};

export default async function AuditPage() {
    const session = await getServerSessionUser();
    if (!session || session.role !== 'admin' || !session.tenantId) {
        redirect('/login');
    }

    return (
        <div className="mx-auto max-w-5xl p-6 space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                    <span>Audit &amp; Incident Logs</span>
                </h1>
                <p className="text-zinc-400">
                    Visualizador de trilha de auditoria administrativa e incidentes de emergência. Apenas leitura.
                </p>
            </div>

            <AuditClient tenantId={session.tenantId} />
        </div>
    );
}
