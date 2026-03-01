import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { domineEventsRepository } from '@/infra/repositories/domine-events.repository';
import { Card, CardContent, CardHeader, Badge } from '@/ui/components';
import { RetryButton } from './_components/retry-button';

export const metadata = {
    title: 'DLQ Manager | Domine | Condstore',
};

export default async function DomineDLQPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const resolvedParams = await searchParams;
    const headersList = await headers();
    const tenantId = headersList.get('x-auth-tenant-id');
    const role = headersList.get('x-auth-role');

    if (!tenantId) {
        redirect('/login');
    }

    if (role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <h1 className="text-2xl font-bold mb-4">Acesso Negado</h1>
                <p className="text-[hsl(var(--cockpit-text-muted))]">Você não tem permissão para acessar o DLQ Manager.</p>
            </div>
        );
    }

    const page = Number(resolvedParams.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const [dlqEvents, totalCount] = await Promise.all([
        domineEventsRepository.listEvents(tenantId, { status: 'failed', limit, offset }),
        domineEventsRepository.getDLQCount(tenantId)
    ]);

    const isIncidentMode = process.env.INCIDENT_MODE === 'true';

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--cockpit-text))]">Dead Letter Queue</h1>
                    <p className="text-sm text-[hsl(var(--cockpit-text-muted))] mt-1">
                        Gerenciamento de eventos que falharam no processamento
                    </p>
                </div>
            </div>

            <Card variant="elevated">
                <CardHeader heading={`Fila (Total: ${totalCount})`} />
                <CardContent className="px-0 py-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="border-b border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-bg))]">
                                <tr>
                                    <th className="px-4 py-3 font-medium">ID / Source</th>
                                    <th className="px-4 py-3 font-medium">Type</th>
                                    <th className="px-4 py-3 font-medium">Error Code / Message</th>
                                    <th className="px-4 py-3 font-medium">Data</th>
                                    <th className="px-4 py-3 font-medium text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[hsl(var(--cockpit-border))]">
                                {dlqEvents.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-6 text-center text-[hsl(var(--cockpit-text-muted))]">
                                            Nenhum evento na DLQ. Tudo limpo!
                                        </td>
                                    </tr>
                                ) : (
                                    dlqEvents.map(evt => (
                                        <tr key={evt.id} className="hover:bg-[hsl(var(--cockpit-bg))] transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-mono text-xs font-semibold">{evt.id.slice(0, 8)}...</div>
                                                <div className="text-[hsl(var(--cockpit-text-muted))] text-xs mt-0.5">{evt.source}</div>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-[hsl(var(--cockpit-text))]">{evt.type}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className="text-red-500 border-red-500 mb-1">{evt.errorCode || 'UNKNOWN_ERROR'}</Badge>
                                                <div className="text-[hsl(var(--cockpit-text-muted))] text-xs truncate max-w-xs" title={evt.errorMessage || ''}>
                                                    {evt.errorMessage || 'Sem log de erro'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-[hsl(var(--cockpit-text-muted))] text-xs">
                                                {new Date(evt.processedAt || evt.createdAt).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <RetryButton eventId={evt.id} disabled={isIncidentMode} />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-between items-center text-sm text-[hsl(var(--cockpit-text-muted))]">
                <p>Mostrando {dlqEvents.length} de {totalCount}</p>

                <div className="flex gap-2">
                    {page > 1 && (
                        <a href={`/cockpit/domine/dlq?page=${page - 1}`} className="px-3 py-1 rounded inline-flex border border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-surface))] hover:bg-[hsl(var(--cockpit-bg))] text-[hsl(var(--cockpit-text))]">
                            Anterior
                        </a>
                    )}
                    {page * limit < totalCount && (
                        <a href={`/cockpit/domine/dlq?page=${page + 1}`} className="px-3 py-1 rounded inline-flex border border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-surface))] hover:bg-[hsl(var(--cockpit-bg))] text-[hsl(var(--cockpit-text))]">
                            Próxima
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}
