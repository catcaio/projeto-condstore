import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getDomineOverviewCounts } from './actions';
import { domineEventsRepository } from '@/infra/repositories/domine-events.repository';
import { Card, CardContent, CardHeader, Badge } from '@/ui/components';
import { RunProcessorButton } from './_components/run-processor-button';
import { CockpitPage } from '@/ui/cockpit/layout/CockpitPage';

export const metadata = {
    title: 'Domine Console | Condstore',
};

export default async function DomineOverviewPage() {
    const headersList = await headers();
    const tenantId = headersList.get('x-auth-tenant-id');
    const role = headersList.get('x-auth-role');

    if (!tenantId) {
        redirect('/login');
    }

    // Role Guard: strictly admin for this module
    if (role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <h1 className="text-2xl font-bold mb-4">Acesso Negado</h1>
                <p className="text-[hsl(var(--cockpit-text-muted))]">Você não tem permissão para acessar o Domine Console.</p>
            </div>
        );
    }

    const [counts, recentEvents] = await Promise.all([
        getDomineOverviewCounts(),
        domineEventsRepository.listEvents(tenantId, { limit: 20 })
    ]);

    const isIncidentMode = process.env.INCIDENT_MODE === 'true';

    return (
        <CockpitPage
            title="DOMINE CONSOLE"
            description="Overview do motor de processamento assíncrono e eventos."
            actions={
                <>
                    {isIncidentMode && (
                        <Badge variant="outline" className="text-red-500 border-red-500">Incident Mode Active</Badge>
                    )}
                    <RunProcessorButton disabled={isIncidentMode} />
                </>
            }
        >
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card variant="elevated">
                    <CardHeader heading="Queued" />
                    <CardContent>
                        <p className="text-3xl font-semibold">{counts.queued || 0}</p>
                    </CardContent>
                </Card>
                <Card variant="elevated">
                    <CardHeader heading="Processing" />
                    <CardContent>
                        <p className="text-3xl font-semibold text-[hsl(var(--ui-accent-blue))]">{counts.processing || 0}</p>
                    </CardContent>
                </Card>
                <Card variant="elevated">
                    <CardHeader heading="Processed" />
                    <CardContent>
                        <p className="text-3xl font-semibold text-green-600">{counts.processed || 0}</p>
                    </CardContent>
                </Card>
                <Card variant="elevated">
                    <CardHeader heading="Failed (DLQ)" />
                    <CardContent>
                        <p className="text-3xl font-semibold text-red-500">{counts.failed || 0}</p>
                    </CardContent>
                </Card>
            </section>

            <section className="mt-8">
                <h2 className="text-xl font-semibold tracking-tight text-[hsl(var(--cockpit-text))] mb-4">Últimos Eventos</h2>
                <div className="rounded-xl border border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-surface))] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="border-b border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-bg))]">
                                <tr>
                                    <th className="px-4 py-3 font-medium">ID / Ref</th>
                                    <th className="px-4 py-3 font-medium">Type</th>
                                    <th className="px-4 py-3 font-medium">Source</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium">Data</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[hsl(var(--cockpit-border))]">
                                {recentEvents.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-4 text-center text-[hsl(var(--cockpit-text-muted))]">
                                            Nenhum evento registrado.
                                        </td>
                                    </tr>
                                ) : (
                                    recentEvents.map(evt => (
                                        <tr key={evt.id} className="hover:bg-[hsl(var(--cockpit-bg))]">
                                            <td className="px-4 py-3">
                                                <div className="font-mono text-xs">{evt.id.slice(0, 8)}...</div>
                                            </td>
                                            <td className="px-4 py-3 font-medium">{evt.type}</td>
                                            <td className="px-4 py-3 text-[hsl(var(--cockpit-text-muted))]">{evt.source}</td>
                                            <td className="px-4 py-3">
                                                <Badge
                                                    variant={
                                                        evt.status === 'processed' ? 'default' :
                                                            evt.status === 'failed' ? 'outline' : 'muted'
                                                    }
                                                    className={evt.status === 'failed' ? 'text-red-500 border-red-500' : ''}
                                                >
                                                    {evt.status}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-[hsl(var(--cockpit-text-muted))]">
                                                {new Date(evt.createdAt).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </CockpitPage>
    );
}
