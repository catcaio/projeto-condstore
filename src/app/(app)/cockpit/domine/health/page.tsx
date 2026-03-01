import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { Card, CardContent, CardHeader, Badge } from '@/ui/components';
import { PageHeader } from '@/ui/components/PageHeader';

export const metadata = {
    title: 'Domine Health | Condstore',
};

export default async function DomineHealthPage() {
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
                <p className="text-[hsl(var(--cockpit-text-muted))]">Você não tem permissão para acessar a área de conectores.</p>
            </div>
        );
    }

    const isIncidentMode = process.env.INCIDENT_MODE === 'true';

    // Simulated Connectors
    const connectors = [
        { id: 'conn_orders', name: 'Tray Orders', status: 'online', lastSync: new Date().toISOString(), type: 'webhook' },
        { id: 'conn_logs', name: 'Bling Logistics', status: 'online', lastSync: new Date(Date.now() - 30000).toISOString(), type: 'poll' },
        { id: 'conn_freight', name: 'Frenet Quoter', status: isIncidentMode ? 'degraded' : 'online', lastSync: new Date(Date.now() - 120000).toISOString(), type: 'sync' }
    ];

    const processingStatus = {
        lastRun: new Date().toLocaleString(),
        circuitBreaker: isIncidentMode ? 'Open' : 'Closed',
        queueLatency: isIncidentMode ? 'High (>500ms)' : 'Low (<50ms)',
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Domine Health & Conectores"
                subtitle="Status do motor de processamento, telemetria em tempo real e conectores ativos"
            />

            {isIncidentMode && (
                <div className="p-4 rounded-md border border-red-500/50 bg-red-500/10 text-red-500">
                    <p className="font-semibold text-lg">⚠️ Incident Mode is ACTIVE</p>
                    <p className="text-sm">Processamentos paralelos podem estar suspensos e o circuit breaker foi aberto globalmente.</p>
                </div>
            )}

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card variant="elevated">
                    <CardHeader heading="Último Processamento" />
                    <CardContent>
                        <p className="text-lg font-mono">{processingStatus.lastRun}</p>
                    </CardContent>
                </Card>
                <Card variant="elevated">
                    <CardHeader heading="Circuit Breaker" />
                    <CardContent>
                        <Badge variant={isIncidentMode ? 'outline' : 'default'} className={isIncidentMode ? 'text-red-500 border-red-500' : 'bg-green-600'}>
                            {processingStatus.circuitBreaker}
                        </Badge>
                    </CardContent>
                </Card>
                <Card variant="elevated">
                    <CardHeader heading="Queue Latency" />
                    <CardContent>
                        <p className={`text-lg font-mono ${isIncidentMode ? 'text-red-500' : 'text-green-600'}`}>
                            {processingStatus.queueLatency}
                        </p>
                    </CardContent>
                </Card>
            </section>

            <section className="mt-8">
                <h2 className="text-xl font-semibold tracking-tight text-[hsl(var(--cockpit-text))] mb-4">Conectores Ativos</h2>
                <div className="rounded-xl border border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-surface))] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="border-b border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-bg))]">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Nome (ID)</th>
                                    <th className="px-4 py-3 font-medium">Type</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium">Último Sync</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[hsl(var(--cockpit-border))]">
                                {connectors.map(c => (
                                    <tr key={c.id} className="hover:bg-[hsl(var(--cockpit-bg))]">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-[hsl(var(--cockpit-text))]">{c.name}</div>
                                            <div className="font-mono text-[hsl(var(--cockpit-text-muted))] text-xs mt-0.5">{c.id}</div>
                                        </td>
                                        <td className="px-4 py-3"><Badge variant="outline">{c.type}</Badge></td>
                                        <td className="px-4 py-3">
                                            <Badge variant={c.status === 'online' ? 'default' : 'outline'} className={c.status !== 'online' ? 'text-yellow-500 border-yellow-500' : 'bg-green-600'}>
                                                {c.status.toUpperCase()}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-[hsl(var(--cockpit-text-muted))]">
                                            {new Date(c.lastSync).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    );
}
