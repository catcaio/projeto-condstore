import React from 'react';
import { AuditTableClient } from './_components/AuditTableClient';
import { Card, CardHeader, CardContent } from '@/ui/components/card';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

async function fetchAuditLogs() {
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    const protocol = isLocalhost ? 'http' : (process.env.NODE_ENV === 'development' ? 'http' : 'https');

    // Attempt to use a fetch utility if it exists globally, otherwise fallback to native fetch
    const url = `${protocol}://${host}/api/cockpit/audit`;

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

        // Mock fallback para caso o banco de dev não tenha registros para conseguir testar a UI
        let events = data.events || [];
        if (events.length === 0 && (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development')) {
            events = [
                {
                    id: 'evt_1',
                    tenantId: 'condstore',
                    type: 'USER_LOGIN',
                    createdAt: new Date().toISOString(),
                    payload: { status: 'success', resource: 'Autenticação' }
                },
                {
                    id: 'evt_2',
                    tenantId: 'condstore',
                    type: 'ITEM_UPDATED',
                    createdAt: new Date(Date.now() - 3600000).toISOString(),
                    payload: { status: 'success', resource: 'Produto XPTO' }
                },
                {
                    id: 'evt_3',
                    tenantId: 'condstore',
                    type: 'BILLING_FAILED',
                    createdAt: new Date(Date.now() - 7200000).toISOString(),
                    payload: { status: 'failure', resource: 'Fatura #111' }
                }
            ];
        }

        return { data: events, error: false, requestId: res.headers.get('x-request-id') || 'unknown' };
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return { data: [], error: true, requestId: `local-${Date.now()}` };
    }
}

export default async function AuditPage() {
    const { data: rawEvents, error, requestId } = await fetchAuditLogs();

    // Transform logs to match the expected format in AuditTableClient
    const formattedData = rawEvents.map((event: any) => {
        // Extrai status do payload se existir, senão define baseado no type ou success
        let status: 'success' | 'failure' | 'pending' = 'success';
        if (event.payload?.status === 'failure' || event.payload?.error) status = 'failure';
        if (event.payload?.status === 'pending') status = 'pending';

        return {
            id: event.id,
            timestamp: event.createdAt,
            actor: event.tenantId || 'Sistema', // O ideal é ter actorId, mas tenantId serve para o MVP
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

            <Card variant="elevated">
                <CardHeader heading="Eventos do Sistema" subheading="Auditoria de ações em tempo real" />
                <CardContent className="pt-0 p-4">
                    <React.Suspense fallback={
                        <div className="h-40 flex items-center justify-center text-[hsl(var(--ui-text-muted))]">
                            Carregando filtros...
                        </div>
                    }>
                        <AuditTableClient
                            initialData={formattedData}
                            initialError={error}
                            requestId={requestId}
                        />
                    </React.Suspense>
                </CardContent>
            </Card>
        </div>
    );
}
