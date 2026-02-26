import React from 'react';
import { Card, CardHeader, CardContent } from '@/ui/components/card';
import { headers } from 'next/headers';
import { AcquisitionClient } from './_components/AcquisitionClient';
import { ModuleGate } from '@/ui/auth/AccessGate';

export const dynamic = 'force-dynamic';

async function fetchAcquisitionData(searchParams: Record<string, string | string[] | undefined>) {
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    const protocol = isLocalhost ? 'http' : (process.env.NODE_ENV === 'development' ? 'http' : 'https');

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
        if (typeof value === 'string') params.set(key, value);
        else if (Array.isArray(value)) params.set(key, value[0]); // simplifying array params to string
    }

    // Default window if none provided to avoid errors
    if (!params.has('window')) params.set('window', '30d');
    if (!params.has('groupBy')) params.set('groupBy', 'utm_source');

    const url = `${protocol}://${host}/api/cockpit/metrics/acquisition?${params.toString()}`;

    try {
        const res = await fetch(url, {
            headers: {
                cookie: headersList.get('cookie') || '',
            },
            cache: 'no-store'
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch acquisition metrics: ${res.status}`);
        }

        const data = await res.json();
        return { data: data.rows || [], totals: data.totals || null, meta: data.meta, error: false, requestId: res.headers.get('x-request-id') || 'unknown' };
    } catch (error) {
        console.error('Error fetching acquisition metrics:', error);
        return { data: [], totals: null, meta: { page: 1, limit: 20, total: 0, totalPages: 0 }, error: true, requestId: `local-${Date.now()}` };
    }
}

export default async function AcquisitionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const resolvedParams = await searchParams;
    const { data: rows, totals, meta, error, requestId } = await fetchAcquisitionData(resolvedParams);

    return (
        <div className="space-y-5 p-6 min-h-screen os-root">
            <h1 className="text-2xl font-bold text-[hsl(var(--ui-text))]">Acquisition (UTM)</h1>
            <p className="text-[hsl(var(--ui-text-muted))] mb-4">
                Análise de performance de tráfego, sessões e simulações agrupadas por UTMs.
            </p>

            <ModuleGate moduleName="acquisition">
                <Card variant="elevated">
                    <CardHeader heading="Atribuição de Performance" subheading="Filtros dinâmicos e exportação de dados" />
                    <CardContent className="pt-0 p-4 relative">
                        <React.Suspense fallback={
                            <div className="h-40 flex items-center justify-center text-[hsl(var(--ui-text-muted))]">
                                Carregando métricas de aquisição...
                            </div>
                        }>
                            <AcquisitionClient
                                data={rows}
                                meta={meta}
                                totals={totals}
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
