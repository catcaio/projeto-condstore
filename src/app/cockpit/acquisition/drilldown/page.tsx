import React from 'react';
import { AcquisitionDrilldownClient } from './_components/AcquisitionDrilldownClient';
import { Card, CardHeader, CardContent } from '@/ui/components/card';
import { headers } from 'next/headers';
import { ModuleGate } from '@/ui/auth/AccessGate';

export const dynamic = 'force-dynamic';

async function fetchDrilldownLogs(searchParams: Record<string, string | string[] | undefined>) {
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    const protocol = isLocalhost ? 'http' : (process.env.NODE_ENV === 'development' ? 'http' : 'https');

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
        if (typeof value === 'string') params.set(key, value);
        else if (Array.isArray(value)) params.set(key, value[0]);
    }

    const url = `${protocol}://${host}/api/cockpit/metrics/acquisition/drilldown?${params.toString()}`;

    try {
        const res = await fetch(url, {
            headers: {
                cookie: headersList.get('cookie') || '',
            },
            cache: 'no-store'
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch drilldown logs: ${res.status}`);
        }

        const data = await res.json();
        return { data: data.events || [], meta: data.meta, error: false, requestId: res.headers.get('x-request-id') || 'unknown' };
    } catch (error) {
        console.error('Error fetching drilldown logs:', error);
        return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 }, error: true, requestId: `local-${Date.now()}` };
    }
}

export default async function AcquisitionDrilldownPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const resolvedParams = await searchParams;
    const { data: rawEvents, meta, error, requestId } = await fetchDrilldownLogs(resolvedParams);

    const formattedData = rawEvents.map((event: any) => ({
        id: event.id,
        timestamp: event.timestamp || new Date().toISOString(),
        type: event.type || 'UNKNOWN',
        action: event.action || 'N/A',
    }));

    const groupByText = resolvedParams.groupBy === 'utm_campaign' ? 'Campanha' : 'Origem';
    const groupValue = resolvedParams.utm_campaign || resolvedParams.utm_source || 'Desconhecida';

    return (
        <div className="space-y-5 p-6 min-h-screen os-root">
            <h1 className="text-2xl font-bold text-[hsl(var(--ui-text))]">
                Detalhes de Aquisição
            </h1>
            <p className="text-[hsl(var(--ui-text-muted))] mb-4">
                Visualização de eventos atrelados ao filtro {groupByText}: <span className="font-semibold text-[hsl(var(--ui-accent-blue))]">{groupValue}</span>
            </p>

            <ModuleGate moduleName="acquisition">
                <Card variant="elevated">
                    <CardHeader heading="Eventos Relacionados" subheading="Eventos públicos, cliques de atribuição e simulações." />
                    <CardContent className="pt-0 p-4 relative">
                        <React.Suspense fallback={
                            <div className="h-40 flex items-center justify-center text-[hsl(var(--ui-text-muted))]">
                                Carregando eventos...
                            </div>
                        }>
                            <AcquisitionDrilldownClient
                                data={formattedData}
                                meta={meta}
                                initialError={error}
                                requestId={requestId}
                            />
                        </React.Suspense>
                    </CardContent>
                </Card>
            </ModuleGate>
        </div>
    );
}
