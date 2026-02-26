import React from 'react';
import { AuditTableClient } from './_components/AuditTableClient';
import { Card, CardHeader, CardContent } from '@/ui/components/card';
import { headers } from 'next/headers';
import { ModuleGate } from '@/ui/auth/AccessGate';

export const dynamic = 'force-dynamic';

async function fetchAuditLogs(searchParams: Record<string, string | string[] | undefined>) {
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    const protocol = isLocalhost ? 'http' : (process.env.NODE_ENV === 'development' ? 'http' : 'https');

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
        if (typeof value === 'string') params.set(key, value);
        else if (Array.isArray(value)) params.set(key, value[0]); // simplifying array params to string
    }

    const url = `${protocol}://${host}/api/cockpit/audit?${params.toString()}`;

    try {
        const res = await fetch(url, {
            headers: {
                // Pass auth tokens if needed from headers
                cookie: headersList.get('cookie') || '',
            },
            cache: 'no-store'
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch audit logs: ${res.status}`);
        }

        const data = await res.json();
        return { data: data.events || [], meta: data.meta, error: false, requestId: res.headers.get('x-request-id') || 'unknown' };
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 }, error: true, requestId: `local-${Date.now()}` };
    }
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const resolvedParams = await searchParams;
    const { data: rawEvents, meta, error, requestId } = await fetchAuditLogs(resolvedParams);

    // Transform logs to match the expected format in AuditTableClient
    const formattedData = rawEvents.map((event: any) => {
        let status: 'success' | 'failure' | 'pending' = 'success';
        if (event.payload?.status === 'failure' || event.payload?.error) status = 'failure';
        if (event.payload?.status === 'pending') status = 'pending';

        return {
            id: event.id,
            timestamp: event.createdAt,
            actor: event.tenantId || 'Sistema',
            action: event.type,
            resource: event.payload?.resource || 'N/A',
            status,
        };
    });

    return (
        <div className="space-y-5 p-6 min-h-screen os-root">
            <h1 className="text-2xl font-bold text-[hsl(var(--ui-text))]">Audit Logs</h1>
            <p className="text-[hsl(var(--ui-text-muted))] mb-4">
                Visualização de auditoria utilizando a nova DataTable enterprise.
            </p>

            <ModuleGate moduleName="audit">
                <Card variant="elevated">
                    <CardHeader heading="Eventos do Sistema" subheading="Auditoria de ações em tempo real" />
                    <CardContent className="pt-0 p-4 relative">
                        <React.Suspense fallback={
                            <div className="h-40 flex items-center justify-center text-[hsl(var(--ui-text-muted))]">
                                Carregando filtros...
                            </div>
                        }>
                            <AuditTableClient
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
